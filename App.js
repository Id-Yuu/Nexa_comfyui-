import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

// Local Imports
import { globalStyles as styles } from './src/styles/globalStyles';
import { getRandomSeed } from './src/utils/helpers';
import { useImageGestures } from './src/hooks/useImageGestures';
import { useComfyWS } from './src/hooks/useComfyWS';
import { OptionsPanel } from './src/components/OptionsPanel';
import { TutorialModal } from './src/components/Modals/TutorialModal';
import { DonationModal } from './src/components/Modals/DonationModal';
import { HistoryDetailsModal } from './src/components/Modals/HistoryDetailsModal';
import { CustomInputModal } from './src/components/Modals/CustomInputModal';
import { MenuModal } from './src/components/Modals/MenuModal';
import { WorkflowBuilderModal } from './src/components/Modals/WorkflowBuilderModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function App() {
  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

  // --- UI STATES ---
  const [showOptions, setShowOptions] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuTab, setMenuTab] = useState('workflows');
  const [serverIP, setServerIP] = useState("192.168.1.100:8188");
  const [toastMsg, setToastMsg] = useState("");
  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(""), 2000); };

  // --- WORKFLOW DATA ---
  const [savedWorkflows, setSavedWorkflows] = useState([]);
  const [activeWorkflow, setActiveWorkflow] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedHistory, setSelectedHistory] = useState(null);

  // --- ENGINE STATES ---
  const [autoValues, setAutoValues] = useState({});
  const [autoSeedsActive, setAutoSeedsActive] = useState({});
  const [visibleLoraIndices, setVisibleLoraIndices] = useState([]);
  const [customValues, setCustomValues] = useState({});
  const [customAutoSeeds, setCustomAutoSeeds] = useState({});

  // --- BUILDER MODALS ---
  const [isWfModalVisible, setIsWfModalVisible] = useState(false);
  const [editingWfId, setEditingWfId] = useState(null);
  const [wfName, setWfName] = useState("");
  const [wfJson, setWfJson] = useState("");
  const [customInputs, setCustomInputs] = useState([]);
  const [autoMapDraft, setAutoMapDraft] = useState({ samplers: [], latents: [], prompts: [], checkpoints: [], ggufs: [], loraSlots: [], loadImages: [] });
  const [isInputModalVisible, setIsInputModalVisible] = useState(false);
  
  // Custom Placeholder Form
  const [inputName, setInputName] = useState("");
  const [inputTrigger, setInputTrigger] = useState("");
  const [inputType, setInputType] = useState("slider");
  const [sliderMin, setSliderMin] = useState("0");
  const [sliderMax, setSliderMax] = useState("1");
  const [sliderStep, setSliderStep] = useState("0.1");
  const [editingInputId, setEditingInputId] = useState(null);

  // --- TUTORIAL & DONATION STATE ---
  const [isTutorialVisible, setIsTutorialVisible] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isDonationVisible, setIsDonationVisible] = useState(false);
  const [hasSeenTutorialHome, setHasSeenTutorialHome] = useState(true);

  // --- CUSTOM HOOKS ---
  const { imgScale, setImgScale, panOffset, setPanOffset, pinchResponder, currentScale, panCurrent, panBase } = useImageGestures();
  const { checkpoints, ggufs, loras, samplers, schedulers, imageUrl, setImageUrl, isGenerating, progress, generateImage } = useComfyWS(serverIP);

  // --- STARTUP LOAD ---
  useEffect(() => {
    const loadAppData = async () => {
      try {
        const savedIP = await AsyncStorage.getItem('comfyIP');
        if (savedIP) setServerIP(savedIP);
        
        const storedWfs = await AsyncStorage.getItem('glassWorkflows');
        if (storedWfs) {
          const parsedWfs = JSON.parse(storedWfs);
          setSavedWorkflows(parsedWfs);
          const activeId = await AsyncStorage.getItem('activeGlassWfId');
          if (activeId) {
            const activeWf = parsedWfs.find(w => w.id === activeId);
            if (activeWf) handleSelectWorkflow(activeWf);
          }
        }
        
        const storedHist = await AsyncStorage.getItem('glassHistory');
        if (storedHist) setHistory(JSON.parse(storedHist));

        const hasSeenTut = await AsyncStorage.getItem('hasSeenTutorialHome');
        if (!hasSeenTut) {
          setHasSeenTutorialHome(false);
          setTimeout(() => { setIsTutorialVisible(true); setTutorialStep(0); }, 500);
        } else {
          setHasSeenTutorialHome(true);
        }
      } catch (e) { }
    };
    loadAppData();
  }, []);

  // --- STATE MUTATION FUNCTIONS ---
  const saveWorkflowSettings = async (wfId, vals) => {
    if (!wfId) return;
    try { await AsyncStorage.setItem(`wfSettings_${wfId}`, JSON.stringify(vals)); } catch (e) { }
  };

  const handleSelectWorkflow = async (workflow) => {
    if (activeWorkflow) saveWorkflowSettings(activeWorkflow.id, { autoValues, customValues, autoSeedsActive, customAutoSeeds, visibleLoraIndices });
    animate(); setActiveWorkflow(workflow); await AsyncStorage.setItem('activeGlassWfId', workflow.id); setIsMenuOpen(false);

    let initialCustom = {}, initialCustomSeeds = {};
    if (workflow.customInputs) {
      workflow.customInputs.forEach(inp => {
        let val = "";
        if (inp.type === 'slider') val = Number(inp.min);
        else if (inp.type === 'seed') { val = getRandomSeed(); initialCustomSeeds[inp.id] = true; }
        else if (inp.type === 'lora') val = "None";
        else if (inp.type === 'sampler') val = "euler";
        else if (inp.type === 'scheduler') val = "normal";
        initialCustom[inp.id] = val;
      });
    }

    let initAuto = {}; let initAutoSeeds = {}; let initialVisLoras = [];
    const json = JSON.parse(workflow.jsonString);
    const map = workflow.autoMap;

    map.samplers.forEach(id => { initAuto[`${id}|seed`] = getRandomSeed(); initAutoSeeds[`${id}|seed`] = true; initAuto[`${id}|steps`] = json[id].inputs.steps; initAuto[`${id}|cfg`] = json[id].inputs.cfg; initAuto[`${id}|sampler_name`] = json[id].inputs.sampler_name; initAuto[`${id}|scheduler`] = json[id].inputs.scheduler; });
    map.latents.forEach(id => { initAuto[`${id}|width`] = json[id].inputs.width; initAuto[`${id}|height`] = json[id].inputs.height; initAuto[`${id}|res_preset`] = "custom"; });
    map.prompts.forEach(id => { initAuto[`${id}|text`] = json[id].inputs.text !== undefined ? json[id].inputs.text : (json[id].inputs.prompt !== undefined ? json[id].inputs.prompt : ""); });
    map.checkpoints.forEach(id => { initAuto[`${id}|ckpt_name`] = json[id].inputs.ckpt_name; });
    map.ggufs.forEach(id => { initAuto[`${id}|unet_name`] = json[id].inputs.unet_name; });
    if (map.loadImages) { map.loadImages.forEach(id => { initAuto[`${id}|image`] = json[id].inputs.image || ""; }); }

    map.loraSlots.forEach((slot, index) => {
      let val = json[slot.nodeId].inputs[slot.loraKey]; initAuto[`${slot.nodeId}|${slot.loraKey}`] = (val === "None" || !val) ? "None" : val;
      if (val && val !== "None") initialVisLoras.push(index);
      if (slot.weightKey) initAuto[`${slot.nodeId}|${slot.weightKey}`] = json[slot.nodeId].inputs[slot.weightKey] !== undefined ? json[slot.nodeId].inputs[slot.weightKey] : 1.0;
    });
    if (initialVisLoras.length === 0 && map.loraSlots.length > 0) initialVisLoras = [0];

    try {
      const stored = await AsyncStorage.getItem(`wfSettings_${workflow.id}`);
      if (stored) {
        const saved = JSON.parse(stored);
        if (saved.autoValues) { for (let k in saved.autoValues) { if (k in initAuto) initAuto[k] = saved.autoValues[k]; } }
        if (saved.autoSeedsActive) { for (let k in saved.autoSeedsActive) { if (k in initAutoSeeds || k in initAuto) initAutoSeeds[k] = saved.autoSeedsActive[k]; } }
        if (saved.customValues) { for (let k in saved.customValues) { if (k in initialCustom) initialCustom[k] = saved.customValues[k]; } }
        if (saved.customAutoSeeds) { for (let k in saved.customAutoSeeds) { if (k in initialCustomSeeds || k in initialCustom) initialCustomSeeds[k] = saved.customAutoSeeds[k]; } }
        if (saved.visibleLoraIndices && Array.isArray(saved.visibleLoraIndices)) initialVisLoras = saved.visibleLoraIndices;
      }
    } catch (e) { }

    setAutoValues(initAuto); setAutoSeedsActive(initAutoSeeds); setVisibleLoraIndices(initialVisLoras);
    setCustomValues(initialCustom); setCustomAutoSeeds(initialCustomSeeds);
  };

  const executeGeneration = () => {
    currentScale.current = 1; setImgScale(1); panCurrent.current = { x: 0, y: 0 }; setPanOffset({ x: 0, y: 0 }); panBase.current = { x: 0, y: 0 };
    if (activeWorkflow) saveWorkflowSettings(activeWorkflow.id, { autoValues, customValues, autoSeedsActive, customAutoSeeds, visibleLoraIndices });
    generateImage({ activeWorkflow, autoValues, setAutoValues, customValues, setCustomValues, autoSeedsActive, customAutoSeeds, visibleLoraIndices, setHistory, setShowOptions });
  };

  const analyzeJson = (jsonString) => {
    if (!jsonString) return Alert.alert("Error", "Paste JSON first.");
    try {
      const parsedJson = JSON.parse(jsonString);
      let map = { samplers: [], latents: [], prompts: [], checkpoints: [], ggufs: [], loraSlots: [], loadImages: [] };
      for (let key in parsedJson) {
        const type = parsedJson[key].class_type;
        if (!type) continue;
        if (type.includes("KSampler")) map.samplers.push(key);
        else if (type.includes("Empty") && type.includes("Latent")) map.latents.push(key);
        else if (type === "CLIPTextEncode" || type === "TextEncodeQwenImageEditPlus") map.prompts.push(key);
        else if (type === "CheckpointLoaderSimple") map.checkpoints.push(key);
        else if (type === "UnetLoaderGGUF") map.ggufs.push(key);
        else if (type === "LoadImage" || type === "LoadImageMask") map.loadImages.push(key);
        if (type.toLowerCase().includes("lora") || type.toLowerCase().includes("stack")) {
          for (let inputKey in parsedJson[key].inputs) {
            if (inputKey.toLowerCase().includes("lora") && typeof parsedJson[key].inputs[inputKey] === "string") {
              let weightKey = null;
              if (inputKey.includes("name_")) weightKey = inputKey.replace("name_", "wt_");
              else if (inputKey.match(/lora_\d+/)) weightKey = inputKey.replace("lora_", "strength_");
              else if (inputKey === "lora_name") weightKey = "strength_model";
              if (!parsedJson[key].inputs.hasOwnProperty(weightKey)) weightKey = null;
              map.loraSlots.push({ nodeId: key, loraKey: inputKey, weightKey: weightKey });
            }
          }
        }
      }
      animate(); setAutoMapDraft(map); return map;
    } catch (e) { Alert.alert("Error", "Invalid JSON format."); return null; }
  };

  const saveWorkflow = async () => {
    if (!wfName || !wfJson) return Alert.alert("Error", "Name and JSON are required.");
    let finalMap = autoMapDraft;
    if (finalMap.samplers.length === 0 && finalMap.prompts.length === 0) finalMap = analyzeJson(wfJson) || autoMapDraft;
    const workflowObj = { id: editingWfId || Date.now().toString(), name: wfName, jsonString: wfJson, autoMap: finalMap, customInputs };
    let updatedWorkflows = editingWfId ? savedWorkflows.map(w => w.id === editingWfId ? workflowObj : w) : [...savedWorkflows, workflowObj];
    animate(); setSavedWorkflows(updatedWorkflows);
    await AsyncStorage.setItem('glassWorkflows', JSON.stringify(updatedWorkflows));
    handleSelectWorkflow(workflowObj); setIsWfModalVisible(false);
  };

  const saveToGallery = async () => {
    if (!imageUrl) return;
    try { 
      const permission = await MediaLibrary.requestPermissionsAsync(true);
      if (permission.status !== 'granted') return; 
      const fileUri = `${FileSystem.cacheDirectory}comfy_${Date.now()}.png`; 
      const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri); 
      await MediaLibrary.saveToLibraryAsync(uri); showToast("Saved");
    } catch (e) { }
  };

  return (
    <View style={styles.container}>
      {imageUrl ? (
        <View style={StyleSheet.absoluteFill} {...pinchResponder.panHandlers}>
          <Image source={{ uri: imageUrl }} style={[StyleSheet.absoluteFillObject, { transform: [{ scale: imgScale }, { translateX: panOffset.x / imgScale }, { translateY: panOffset.y / imgScale }] }]} resizeMode="contain" />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111' }]} />
      )}

      <BlurView intensity={70} tint="dark" style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={() => { animate(); setIsMenuOpen(true); }}><Ionicons name="menu" size={28} color="#fff" /></TouchableOpacity>
        <View style={styles.progressWrapper}>{isGenerating && (<View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>)}</View>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.topBtn, { marginRight: 10 }]} onPress={async () => {
              if (!imageUrl) return;
              try { const fileUri = `${FileSystem.cacheDirectory}share_${Date.now()}.png`; const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri); await Sharing.shareAsync(uri); } catch (e) { }
          }}><Ionicons name="share-outline" size={24} color="#fff" /></TouchableOpacity>
          <TouchableOpacity style={styles.topBtn} onPress={saveToGallery}><Ionicons name="download-outline" size={24} color="#fff" /></TouchableOpacity>
        </View>
      </BlurView>

      {showOptions && (
        <>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          <ScrollView style={StyleSheet.absoluteFillObject} contentContainerStyle={{ paddingTop: 100, paddingHorizontal: 16 }}>
            <OptionsPanel 
              activeWorkflow={activeWorkflow} autoValues={autoValues} updateAutoValue={(k, v) => setAutoValues(p => ({ ...p, [k]: v }))}
              customValues={customValues} setCustomValues={setCustomValues} autoSeedsActive={autoSeedsActive} setAutoSeedsActive={setAutoSeedsActive}
              customAutoSeeds={customAutoSeeds} setCustomAutoSeeds={setCustomAutoSeeds} visibleLoraIndices={visibleLoraIndices}
              addLoraSlot={() => { animate(); for (let i = 0; i < activeWorkflow.autoMap.loraSlots.length; i++) { if (!visibleLoraIndices.includes(i)) { setVisibleLoraIndices([...visibleLoraIndices, i]); break; } } }}
              removeLoraSlot={(index) => { animate(); setVisibleLoraIndices(visibleLoraIndices.filter(i => i !== index)); }}
              checkpoints={checkpoints} ggufs={ggufs} loras={loras} samplers={samplers} schedulers={schedulers} serverIP={serverIP}
            />
          </ScrollView>
        </>
      )}

      {toastMsg !== "" && <View style={styles.toast}><Text style={styles.toastText}>{toastMsg}</Text></View>}

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.roundGlassBtn} onPress={() => { animate(); setShowOptions(!showOptions); }}><Ionicons name={showOptions ? "chevron-down" : "chevron-up"} size={28} color="#0A84FF" /></TouchableOpacity>
        <TouchableOpacity style={styles.playBtn} onPress={executeGeneration} disabled={isGenerating}>{isGenerating ? <ActivityIndicator color="#fff" /> : <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 4 }} />}</TouchableOpacity>
      </View>

      <MenuModal 
        isMenuOpen={isMenuOpen} setIsMenuOpen={setIsMenuOpen} menuTab={menuTab} setMenuTab={setMenuTab}
        openAddModal={() => { animate(); setEditingWfId(null); setWfName(""); setWfJson(""); setCustomInputs([]); setAutoMapDraft({ samplers: [], latents: [], prompts: [], checkpoints: [], ggufs: [], loraSlots: [], loadImages: [] }); setIsWfModalVisible(true); }}
        savedWorkflows={savedWorkflows} activeWorkflow={activeWorkflow} handleSelectWorkflow={handleSelectWorkflow}
        deleteWorkflow={async (id) => { animate(); const updated = savedWorkflows.filter(w => w.id !== id); setSavedWorkflows(updated); await AsyncStorage.setItem('glassWorkflows', JSON.stringify(updated)); if (activeWorkflow?.id === id) { setActiveWorkflow(null); await AsyncStorage.removeItem('activeGlassWfId'); } }}
        openEditModal={(wf) => { animate(); setEditingWfId(wf.id); setWfName(wf.name); setWfJson(wf.jsonString); setCustomInputs(wf.customInputs || []); setAutoMapDraft(wf.autoMap || { samplers: [], latents: [], prompts: [], checkpoints: [], ggufs: [], loraSlots: [], loadImages: [] }); setIsWfModalVisible(true); }}
        history={history} setHistory={setHistory} setSelectedHistory={setSelectedHistory} serverIP={serverIP} setServerIP={setServerIP} showToast={showToast}
        setIsTutorialVisible={setIsTutorialVisible} setTutorialStep={setTutorialStep} setIsDonationVisible={setIsDonationVisible}
      />

      <WorkflowBuilderModal 
        isWfModalVisible={isWfModalVisible} setIsWfModalVisible={setIsWfModalVisible} editingWfId={editingWfId}
        wfName={wfName} setWfName={setWfName} wfJson={wfJson} setWfJson={setWfJson} analyzeJson={analyzeJson} autoMapDraft={autoMapDraft}
        moveAutoDraftItem={(category, index, direction) => { animate(); setAutoMapDraft(prev => { const updated = { ...prev }; const arr = [...updated[category]]; if (direction === 'up' && index > 0) [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]]; else if (direction === 'down' && index < arr.length - 1) [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]]; updated[category] = arr; return updated; }); }}
        removeAutoDraftItem={(category, item) => { animate(); setAutoMapDraft(prev => { const updated = { ...prev }; if (category === 'loraSlots') updated.loraSlots = updated.loraSlots.filter(s => s.nodeId !== item.nodeId || s.loraKey !== item.loraKey); else updated[category] = updated[category].filter(id => id !== item); return updated; }); }}
        customInputs={customInputs} setEditingInputId={setEditingInputId} setInputName={setInputName} setInputTrigger={setInputTrigger} setInputType={setInputType} setSliderMin={setSliderMin} setSliderMax={setSliderMax} setSliderStep={setSliderStep} setIsInputModalVisible={setIsInputModalVisible} saveWorkflow={saveWorkflow}
        removeCustomPlaceholder={(id) => Alert.alert("Delete", "Remove this placeholder?", [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: () => { animate(); setCustomInputs(customInputs.filter(i => i.id !== id)); } }])}
        editCustomPlaceholder={(inp) => { setEditingInputId(inp.id); setInputName(inp.name); setInputTrigger(inp.trigger); setInputType(inp.type); setSliderMin(inp.min || "0"); setSliderMax(inp.max || "1"); setSliderStep(inp.step || "0.1"); setIsInputModalVisible(true); }}
      />

      <CustomInputModal 
        visible={isInputModalVisible} editingInputId={editingInputId} inputName={inputName} setInputName={setInputName} inputTrigger={inputTrigger} setInputTrigger={setInputTrigger} inputType={inputType} setInputType={setInputType} sliderMin={sliderMin} setSliderMin={setSliderMin} sliderMax={sliderMax} setSliderMax={setSliderMax} sliderStep={sliderStep} setSliderStep={setSliderStep}
        onClose={() => setIsInputModalVisible(false)}
        onSave={() => { if (!inputName || !inputTrigger) return Alert.alert("Error", "Required fields missing."); const newInput = { id: editingInputId || Date.now().toString(), name: inputName, trigger: inputTrigger, type: inputType, min: sliderMin, max: sliderMax, step: sliderStep }; animate(); if (editingInputId) { setCustomInputs(customInputs.map(i => i.id === editingInputId ? newInput : i)); } else { setCustomInputs([...customInputs, newInput]); } setIsInputModalVisible(false); setEditingInputId(null); setInputName(""); setInputTrigger(""); setInputType("slider"); setSliderMin("0"); setSliderMax("1"); setSliderStep("0.1"); }}
      />

      <HistoryDetailsModal selectedHistory={selectedHistory} setSelectedHistory={setSelectedHistory} history={history} setHistory={setHistory} />
      <TutorialModal visible={isTutorialVisible} step={tutorialStep} setStep={setTutorialStep} onClose={async () => { setIsTutorialVisible(false); if (!hasSeenTutorialHome) { setHasSeenTutorialHome(true); await AsyncStorage.setItem('hasSeenTutorialHome', 'true'); setTimeout(() => setIsDonationVisible(true), 500); } }} />
      <DonationModal visible={isDonationVisible} onClose={() => setIsDonationVisible(false)} />
    </View>
  );
}