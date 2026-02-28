import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, ScrollView, Alert, Modal, LayoutAnimation, Platform, UIManager, Dimensions, ActivityIndicator, PanResponder, FlatList, Linking } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Slider from '@react-native-community/slider';
import { BlurView } from 'expo-blur';

const CustomGlassPicker = ({ selectedValue, onValueChange, items, placeholder = "Select an option" }) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedItem = items.find(item => item.value === selectedValue);
  const displayLabel = selectedItem ? selectedItem.label : placeholder;

  return (
    <>
      <TouchableOpacity
        style={styles.glassPickerBtn}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.glassPickerText} numberOfLines={1}>{displayLabel}</Text>
        <Ionicons name="chevron-down" size={20} color="#ccc" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView intensity={120} tint="dark" style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#888" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={items}
              keyExtractor={(item, index) => item.value + index.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                const isHeader = item.value && item.value.startsWith('header_');

                if (isHeader) {
                  return (
                    <View style={styles.pickerHeaderItem}>
                      <Text style={styles.pickerHeaderText}>{item.label}</Text>
                    </View>
                  );
                }

                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
                    onPress={() => {
                      onValueChange(item.value);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
                      {item.label}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color="#0A84FF" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </BlurView>
      </Modal>
    </>
  );
};

import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const RESOLUTIONS = [
  { label: "Custom Resolution", value: "custom" },
  { label: "--- SD 1.5 ---", value: "header_sd15" },
  { label: "1:1 Square (512x512)", value: "512x512" },
  { label: "2:3 Portrait (512x768)", value: "512x768" },
  { label: "3:2 Landscape (768x512)", value: "768x512" },
  { label: "--- SDXL ---", value: "header_sdxl" },
  { label: "1:1 Square (1024x1024)", value: "1024x1024" },
  { label: "4:3 Landscape (1152x896)", value: "1152x896" },
  { label: "3:4 Portrait (896x1152)", value: "896x1152" },
  { label: "3:2 Landscape (1216x832)", value: "1216x832" },
  { label: "2:3 Portrait (832x1216)", value: "832x1216" },
  { label: "16:9 Landscape (1344x768)", value: "1344x768" },
  { label: "9:16 Portrait (768x1344)", value: "768x1344" },
  { label: "2.4:1 Landscape (1536x640)", value: "1536x640" },
  { label: "1:2.4 Portrait (640x1536)", value: "640x1536" },
  { label: "--- QWEN / FLUX ---", value: "header_qwen" },
  { label: "1:1 Square (1328x1328)", value: "1328x1328" },
  { label: "16:9 Landscape (1664x928)", value: "1664x928" },
  { label: "9:16 Portrait (928x1664)", value: "928x1664" },
  { label: "4:3 Landscape (1472x1104)", value: "1472x1104" },
  { label: "3:4 Portrait (1140x1472)", value: "1140x1472" },
  { label: "3:2 Landscape (1584x1056)", value: "1584x1056" },
  { label: "2:3 Portrait (1056x1584)", value: "1056x1584" },
  { label: "--- OTHER ---", value: "header_other" },
  { label: "HD 720p (1280x720)", value: "1280x720" },
  { label: "HD 720p Vertical (720x1280)", value: "720x1280" },
];

export default function App() {
  // --- UI STATES ---
  const [showOptions, setShowOptions] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuTab, setMenuTab] = useState('workflows');

  const [toastMsg, setToastMsg] = useState("");
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2000);
  };


  const [serverIP, setServerIP] = useState("192.168.1.100:8188");
  const [clientId] = useState(Math.random().toString(36).substring(2, 15));

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

  // --- SERVER DATA ---
  const [checkpoints, setCheckpoints] = useState([]);
  const [ggufs, setGgufs] = useState([]);
  const [loras, setLoras] = useState([]);
  const [samplers, setSamplers] = useState(["euler", "euler_ancestral", "dpmpp_2m"]);
  const [schedulers, setSchedulers] = useState(["normal", "karras", "simple"]);

  // --- BUILDER MODALS ---
  const [isWfModalVisible, setIsWfModalVisible] = useState(false);
  const [editingWfId, setEditingWfId] = useState(null);
  const [wfName, setWfName] = useState("");
  const [wfJson, setWfJson] = useState("");
  const [customInputs, setCustomInputs] = useState([]);
  const [autoMapDraft, setAutoMapDraft] = useState({ samplers: [], latents: [], prompts: [], checkpoints: [], ggufs: [], loraSlots: [], loadImages: [] });

  const [isInputModalVisible, setIsInputModalVisible] = useState(false);
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

  // --- GENERATION STATE ---
  const [imageUrl, setImageUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState("Ready");
  const [progress, setProgress] = useState(0);
  const wsRef = useRef(null);

  // --- PINCH-TO-ZOOM + PAN ---
  const [imgScale, setImgScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const lastPinchDist = useRef(0);
  const pinchBaseScale = useRef(1);
  const currentScale = useRef(1);
  const panStart = useRef({ x: 0, y: 0 });
  const panBase = useRef({ x: 0, y: 0 });
  const panCurrent = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);

  const pinchResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: (evt) => currentScale.current > 1,
    onMoveShouldSetPanResponder: (evt) => {
      if (evt.nativeEvent.touches && evt.nativeEvent.touches.length >= 2) return true;
      if (currentScale.current > 1) return true;
      return false;
    },
    onPanResponderGrant: (evt) => {
      if (evt.nativeEvent.touches && evt.nativeEvent.touches.length === 2) {
        isPinching.current = true;
        const [t1, t2] = evt.nativeEvent.touches;
        lastPinchDist.current = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
        pinchBaseScale.current = currentScale.current;
      } else {
        isPinching.current = false;
        panStart.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
        panBase.current = { ...panCurrent.current };
      }
    },
    onPanResponderMove: (evt) => {
      if (evt.nativeEvent.touches && evt.nativeEvent.touches.length === 2) {
        const [t1, t2] = evt.nativeEvent.touches;
        const dist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY);
        if (!isPinching.current || lastPinchDist.current === 0) {
          isPinching.current = true;
          lastPinchDist.current = dist;
          pinchBaseScale.current = currentScale.current;
        } else {
          const s = Math.min(5, Math.max(0.5, pinchBaseScale.current * (dist / lastPinchDist.current)));
          currentScale.current = s;
          setImgScale(s);
        }
      } else if (currentScale.current > 1 && !isPinching.current) {
        const dx = evt.nativeEvent.pageX - panStart.current.x;
        const dy = evt.nativeEvent.pageY - panStart.current.y;
        const newOffset = { x: panBase.current.x + dx, y: panBase.current.y + dy };
        panCurrent.current = newOffset;
        setPanOffset(newOffset);
      }
    },
    onPanResponderRelease: () => {
      lastPinchDist.current = 0;
      isPinching.current = false;
      if (currentScale.current <= 1) {
        currentScale.current = 1; setImgScale(1);
        panCurrent.current = { x: 0, y: 0 };
        setPanOffset({ x: 0, y: 0 }); panBase.current = { x: 0, y: 0 };
      }
    }
  })).current;

  const getCleanIP = () => serverIP.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  const getRandomSeed = () => Math.floor(Math.random() * 9007199254740991).toString();

  const closeTutorial = async () => {
    setIsTutorialVisible(false);
    if (!hasSeenTutorialHome) {
      setHasSeenTutorialHome(true);
      await AsyncStorage.setItem('hasSeenTutorialHome', 'true');
      setTimeout(() => setIsDonationVisible(true), 500);
    }
  };

  // --- STARTUP & WEBSOCKETS ---
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

  useEffect(() => {
    if (!serverIP) return;
    const cleanIP = getCleanIP();

    const fetchModels = async () => {
      try {
        const response = await fetch(`http://${cleanIP}/object_info`);
        const data = await response.json();
        setCheckpoints(data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || checkpoints);
        setGgufs(data?.UnetLoaderGGUF?.input?.required?.unet_name?.[0] || ggufs);
        setLoras(data?.LoraLoaderModelOnly?.input?.required?.lora_name?.[0] || loras);
        setSamplers(data?.KSampler?.input?.required?.sampler_name?.[0] || samplers);
        setSchedulers(data?.KSampler?.input?.required?.scheduler?.[0] || schedulers);
      } catch (error) { }
    };
    fetchModels();

    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`ws://${cleanIP}/ws?clientId=${clientId}`);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'progress') {
          setProgress(Math.round((msg.data.value / msg.data.max) * 100));
        }
        if (msg.type === 'execution_success') {
          setProgress(100);
        }
        if (msg.type === 'execution_error' || msg.type === 'execution_interrupted') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setIsGenerating(false);
          setShowOptions(true);
          const errorMsg = msg.data?.exception_message || msg.data?.message || 'ComfyUI encountered an error during generation.';
          Alert.alert('Generation Error', errorMsg);
        }
      } catch (e) { }
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [serverIP]);

  // --- ENGINE LOGIC ---
  const openAddModal = () => { animate(); setEditingWfId(null); setWfName(""); setWfJson(""); setCustomInputs([]); setAutoMapDraft({ samplers: [], latents: [], prompts: [], checkpoints: [], ggufs: [], loraSlots: [], loadImages: [] }); setIsWfModalVisible(true); };
  const openEditModal = (wf) => { animate(); setEditingWfId(wf.id); setWfName(wf.name); setWfJson(wf.jsonString); setCustomInputs(wf.customInputs || []); setAutoMapDraft(wf.autoMap || { samplers: [], latents: [], prompts: [], checkpoints: [], ggufs: [], loraSlots: [], loadImages: [] }); setIsWfModalVisible(true); };

  const analyzeJson = (jsonString = wfJson) => {
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

  const removeAutoDraftItem = (category, item) => { animate(); setAutoMapDraft(prev => { const updated = { ...prev }; if (category === 'loraSlots') updated.loraSlots = updated.loraSlots.filter(s => s.nodeId !== item.nodeId || s.loraKey !== item.loraKey); else updated[category] = updated[category].filter(id => id !== item); return updated; }); };

  const moveAutoDraftItem = (category, index, direction) => {
    animate();
    setAutoMapDraft(prev => {
      const updated = { ...prev };
      const arr = [...updated[category]];
      if (direction === 'up' && index > 0) {
        [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
      } else if (direction === 'down' && index < arr.length - 1) {
        [arr[index + 1], arr[index]] = [arr[index], arr[index + 1]];
      }
      updated[category] = arr;
      return updated;
    });
  };

  const saveWorkflow = async () => {
    if (!wfName || !wfJson) return Alert.alert("Error", "Name and JSON are required.");
    let finalMap = autoMapDraft;
    if (finalMap.samplers.length === 0 && finalMap.prompts.length === 0) finalMap = analyzeJson(wfJson) || autoMapDraft;
    const workflowObj = { id: editingWfId || Date.now().toString(), name: wfName, jsonString: wfJson, autoMap: finalMap, customInputs };
    let updatedWorkflows = editingWfId ? savedWorkflows.map(w => w.id === editingWfId ? workflowObj : w) : [...savedWorkflows, workflowObj];
    animate(); setSavedWorkflows(updatedWorkflows); await AsyncStorage.setItem('glassWorkflows', JSON.stringify(updatedWorkflows));
    handleSelectWorkflow(workflowObj); setIsWfModalVisible(false);
  };

  const deleteWorkflow = async (id) => { animate(); const updated = savedWorkflows.filter(w => w.id !== id); setSavedWorkflows(updated); await AsyncStorage.setItem('glassWorkflows', JSON.stringify(updated)); if (activeWorkflow?.id === id) { setActiveWorkflow(null); await AsyncStorage.removeItem('activeGlassWfId'); } };

  const saveCustomPlaceholder = () => {
    if (!inputName || !inputTrigger) return Alert.alert("Error", "Required fields missing.");
    const newInput = { id: editingInputId || Date.now().toString(), name: inputName, trigger: inputTrigger, type: inputType, min: sliderMin, max: sliderMax, step: sliderStep };
    if (editingInputId) {
      animate(); setCustomInputs(customInputs.map(i => i.id === editingInputId ? newInput : i));
    } else {
      animate(); setCustomInputs([...customInputs, newInput]);
    }
    setIsInputModalVisible(false); setEditingInputId(null); setInputName(""); setInputTrigger(""); setInputType("slider"); setSliderMin("0"); setSliderMax("1"); setSliderStep("0.1");
  };

  const editCustomPlaceholder = (inp) => {
    setEditingInputId(inp.id); setInputName(inp.name); setInputTrigger(inp.trigger); setInputType(inp.type);
    setSliderMin(inp.min || "0"); setSliderMax(inp.max || "1"); setSliderStep(inp.step || "0.1");
    setIsInputModalVisible(true);
  };

  const removeCustomPlaceholder = (id) => {
    Alert.alert("Delete", "Remove this placeholder?", [
      { text: "Cancel" },
      { text: "Delete", style: "destructive", onPress: () => { animate(); setCustomInputs(customInputs.filter(i => i.id !== id)); } }
    ]);
  };

  const saveWorkflowSettings = async (wfId, vals) => {
    if (!wfId) return;
    try { await AsyncStorage.setItem(`wfSettings_${wfId}`, JSON.stringify(vals)); } catch (e) { }
  };

  const handleSelectWorkflow = async (workflow) => {
    // Save current workflow settings before switching
    if (activeWorkflow) {
      saveWorkflowSettings(activeWorkflow.id, { autoValues, customValues, autoSeedsActive, customAutoSeeds, visibleLoraIndices });
    }

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
    const json = JSON.parse(workflow.jsonString); const map = workflow.autoMap;

    map.samplers.forEach(id => { initAuto[`${id}|seed`] = getRandomSeed(); initAutoSeeds[`${id}|seed`] = true; initAuto[`${id}|steps`] = json[id].inputs.steps; initAuto[`${id}|cfg`] = json[id].inputs.cfg; initAuto[`${id}|sampler_name`] = json[id].inputs.sampler_name; initAuto[`${id}|scheduler`] = json[id].inputs.scheduler; });
    map.latents.forEach(id => {
      initAuto[`${id}|width`] = json[id].inputs.width;
      initAuto[`${id}|height`] = json[id].inputs.height;
      initAuto[`${id}|res_preset`] = "custom";
    });
    map.prompts.forEach(id => { initAuto[`${id}|text`] = json[id].inputs.text !== undefined ? json[id].inputs.text : (json[id].inputs.prompt !== undefined ? json[id].inputs.prompt : ""); });
    map.checkpoints.forEach(id => { initAuto[`${id}|ckpt_name`] = json[id].inputs.ckpt_name; });
    map.ggufs.forEach(id => { initAuto[`${id}|unet_name`] = json[id].inputs.unet_name; });
    if (map.loadImages) {
      map.loadImages.forEach(id => { initAuto[`${id}|image`] = json[id].inputs.image || ""; });
    }

    map.loraSlots.forEach((slot, index) => {
      let val = json[slot.nodeId].inputs[slot.loraKey]; initAuto[`${slot.nodeId}|${slot.loraKey}`] = (val === "None" || !val) ? "None" : val;
      if (val && val !== "None") initialVisLoras.push(index);
      if (slot.weightKey) initAuto[`${slot.nodeId}|${slot.weightKey}`] = json[slot.nodeId].inputs[slot.weightKey] !== undefined ? json[slot.nodeId].inputs[slot.weightKey] : 1.0;
    });
    if (initialVisLoras.length === 0 && map.loraSlots.length > 0) initialVisLoras = [0];

    // Load saved settings and merge over defaults
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

  const updateAutoValue = (key, val) => setAutoValues(prev => ({ ...prev, [key]: val }));
  const addLoraSlot = () => { animate(); for (let i = 0; i < activeWorkflow.autoMap.loraSlots.length; i++) { if (!visibleLoraIndices.includes(i)) { setVisibleLoraIndices([...visibleLoraIndices, i]); break; } } };
  const removeLoraSlot = (index) => { animate(); setVisibleLoraIndices(visibleLoraIndices.filter(i => i !== index)); };

  const generateImage = async () => {
    if (!activeWorkflow) return Alert.alert("Error", "Select a workflow first.");
    const cleanIP = getCleanIP();

    animate();
    setIsGenerating(true); setProgress(0); setImageUrl(null); setShowOptions(false); currentScale.current = 1; setImgScale(1); panCurrent.current = { x: 0, y: 0 }; setPanOffset({ x: 0, y: 0 }); panBase.current = { x: 0, y: 0 };
    // Save workflow settings on generate
    if (activeWorkflow) saveWorkflowSettings(activeWorkflow.id, { autoValues, customValues, autoSeedsActive, customAutoSeeds, visibleLoraIndices });

    try {
      let str = activeWorkflow.jsonString;
      let currentCustomVals = { ...customValues };
      if (activeWorkflow.customInputs) {
        activeWorkflow.customInputs.forEach(inp => {
          if (inp.type === 'seed' && customAutoSeeds[inp.id]) currentCustomVals[inp.id] = getRandomSeed();
          let val = currentCustomVals[inp.id] != null ? currentCustomVals[inp.id] : "";
          if (inp.type === 'lora' && val === "") val = "None";
          // Strip surrounding quotes from trigger if user included them
          let trigger = inp.trigger;
          if ((trigger.startsWith('"') && trigger.endsWith('"')) || (trigger.startsWith("'") && trigger.endsWith("'"))) {
            trigger = trigger.slice(1, -1);
          }
          if (['text', 'string', 'lora', 'model', 'gguf', 'sampler', 'scheduler'].includes(inp.type)) {
            str = str.split(`"${trigger}"`).join(JSON.stringify(val));
          } else {
            // For numeric types: replace quoted trigger with number, also replace bare trigger
            const numVal = String(Number(val));
            str = str.split(`"${trigger}"`).join(numVal);
            str = str.split(trigger).join(numVal);
          }
        });
        setCustomValues(currentCustomVals);
      }

      let finalWorkflowObj;
      try { finalWorkflowObj = JSON.parse(str); } catch (e) { setIsGenerating(false); setShowOptions(true); return Alert.alert("JSON Error", "Custom Trigger replacement failed."); }

      const map = activeWorkflow.autoMap;
      if (map) {
        let currentAutoVals = { ...autoValues };

        if (map.loadImages) {
          for (let id of map.loadImages) {
            const localUri = currentAutoVals[`${id}|image`];
            if (localUri && localUri.startsWith('file://')) {
              const formData = new FormData();
              let filename = localUri.split('/').pop() || `upload_${Date.now()}.jpg`;
              let match = /\.(\w+)$/.exec(filename);
              let type = match ? `image/${match[1]}` : `image`;
              formData.append('image', { uri: localUri, name: filename, type });
              formData.append('overwrite', 'true');
              formData.append('type', 'input');
              try {
                const upRes = await fetch(`http://${cleanIP}/upload/image`, { method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data' } });
                const upData = await upRes.json();
                if (upData.name) currentAutoVals[`${id}|image`] = upData.name;
              } catch (err) { console.log('Upload error', err); }
            }
          }
        }

        for (let key in autoSeedsActive) { if (autoSeedsActive[key]) currentAutoVals[key] = getRandomSeed(); }
        setAutoValues(currentAutoVals);

        const inject = (nodeId, key, val) => { if (finalWorkflowObj[nodeId] && finalWorkflowObj[nodeId].inputs) finalWorkflowObj[nodeId].inputs[key] = val; };

        map.samplers.forEach(id => { inject(id, 'seed', Number(currentAutoVals[`${id}|seed`])); inject(id, 'steps', currentAutoVals[`${id}|steps`]); inject(id, 'cfg', currentAutoVals[`${id}|cfg`]); inject(id, 'sampler_name', currentAutoVals[`${id}|sampler_name`]); inject(id, 'scheduler', currentAutoVals[`${id}|scheduler`]); });
        map.latents.forEach(id => { inject(id, 'width', Number(currentAutoVals[`${id}|width`])); inject(id, 'height', Number(currentAutoVals[`${id}|height`])); });
        map.prompts.forEach(id => {
          if (finalWorkflowObj[id].inputs.text !== undefined) inject(id, 'text', currentAutoVals[`${id}|text`]);
          else if (finalWorkflowObj[id].inputs.prompt !== undefined) inject(id, 'prompt', currentAutoVals[`${id}|text`]);
        });
        map.checkpoints.forEach(id => { inject(id, 'ckpt_name', currentAutoVals[`${id}|ckpt_name`]); });
        map.ggufs.forEach(id => { inject(id, 'unet_name', currentAutoVals[`${id}|unet_name`]); });
        if (map.loadImages) {
          map.loadImages.forEach(id => { if (currentAutoVals[`${id}|image`]) inject(id, 'image', currentAutoVals[`${id}|image`]); });
        }

        map.loraSlots.forEach((slot, index) => {
          const isVisible = visibleLoraIndices.includes(index); const rawVal = currentAutoVals[`${slot.nodeId}|${slot.loraKey}`]; const finalLoraVal = (isVisible && rawVal && rawVal !== "") ? rawVal : "None";
          inject(slot.nodeId, slot.loraKey, finalLoraVal); if (isVisible && slot.weightKey) inject(slot.nodeId, slot.weightKey, Number(currentAutoVals[`${slot.nodeId}|${slot.weightKey}`] || 1.0));
        });
      }

      const response = await fetch(`http://${cleanIP}/prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: finalWorkflowObj, client_id: clientId }) });
      const data = await response.json();

      if (data.error || data.node_errors && Object.keys(data.node_errors).length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsGenerating(false); setShowOptions(true);
        const errMsg = data.error?.message || 'ComfyUI rejected the prompt. Check your workflow for errors.';
        const nodeErrs = data.node_errors ? Object.values(data.node_errors).map(n => n.errors?.map(e => e.message).join(', ')).filter(Boolean).join('\n') : '';
        Alert.alert('Prompt Error', nodeErrs || errMsg);
        return;
      }

      const promptId = data.prompt_id;
      let pollCount = 0;
      const maxPolls = 180; // 360 seconds timeout (6 mins)

      const interval = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
          clearInterval(interval); setIsGenerating(false); setShowOptions(true);
          Alert.alert('Timeout', 'Generation timed out after 6 minutes.');
          return;
        }
        try {
          const historyRes = await fetch(`http://${cleanIP}/history/${promptId}`); const historyData = await historyRes.json();
          if (historyData[promptId]) {
            clearInterval(interval);

            // Check if execution had an error status
            const status = historyData[promptId].status;
            if (status && status.status_str === 'error') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setIsGenerating(false); setShowOptions(true);
              Alert.alert('Generation Error', status.messages?.map(m => m[1]?.message).filter(Boolean).join('\n') || 'An error occurred during generation.');
              return;
            }

            const outputs = historyData[promptId].outputs; let filename = "", folderType = "", subfolder = "";
            for (let nodeId in outputs) {
              if (outputs[nodeId].images && outputs[nodeId].images.length > 0) { filename = outputs[nodeId].images[0].filename; folderType = outputs[nodeId].images[0].type; subfolder = outputs[nodeId].images[0].subfolder; break; }
            }
            if (filename) {
              const generatedUrl = `http://${cleanIP}/view?filename=${filename}&type=${folderType}&subfolder=${subfolder}`;
              setImageUrl(generatedUrl);
              setHistory(prev => {
                const newHist = { id: promptId, imageUrl: generatedUrl, prompt: finalWorkflowObj, date: Date.now() };
                const updated = [newHist, ...prev].slice(0, 50);
                AsyncStorage.setItem('glassHistory', JSON.stringify(updated));
                return updated;
              });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            setIsGenerating(false);
          }
        } catch (e) {
          clearInterval(interval); setIsGenerating(false); setShowOptions(true);
          Alert.alert('Error', 'Lost connection while waiting for result.');
        }
      }, 2000);
    } catch (error) { setIsGenerating(false); setShowOptions(true); Alert.alert("Network Error", "Could not connect to ComfyUI server."); }
  };

  const saveToGallery = async () => {
    if (!imageUrl) return;
    try { const permission = await MediaLibrary.requestPermissionsAsync(true); if (permission.status !== 'granted') return; const fileUri = `${FileSystem.cacheDirectory}comfy_${Date.now()}.png`; const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri); await MediaLibrary.saveToLibraryAsync(uri); showToast("Saved"); } catch (e) { }
  };

  const shareImg = async () => {
    if (!imageUrl) return;
    try { const fileUri = `${FileSystem.cacheDirectory}share_${Date.now()}.png`; const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri); await Sharing.shareAsync(uri); } catch (e) { }
  };

  const guessPromptType = (text) => { const lower = String(text).toLowerCase(); return (lower.includes("bad") || lower.includes("worst") || lower.includes("ugly")) ? "NEGATIVE PROMPT" : "PROMPT"; };

  // --- UI COMPONENTS ---
  const toggleOptions = () => { animate(); setShowOptions(!showOptions); };

  const renderInputs = () => {
    if (!activeWorkflow) return <View style={styles.glassCard}><Text style={styles.emptyText}>No Workflow Selected. Open menu to add one.</Text></View>;
    return (
      <View style={{ paddingBottom: 120 }}>
        {activeWorkflow.autoMap.prompts.length > 0 && <Text style={styles.sectionHeader}>Text Prompts</Text>}
        {activeWorkflow.autoMap.prompts.map(id => (
          <BlurView intensity={120} tint="dark" style={styles.glassCard} key={`prompt_${id}`}>
            <Text style={styles.label}>{guessPromptType(autoValues[`${id}|text`])}</Text>
            <TextInput style={[styles.glassInput, { height: 80 }]} multiline value={autoValues[`${id}|text`]} onChangeText={(t) => updateAutoValue(`${id}|text`, t)} />
          </BlurView>
        ))}

        {(activeWorkflow.autoMap.checkpoints.length > 0 || activeWorkflow.autoMap.ggufs.length > 0) && <Text style={styles.sectionHeader}>Models & Base Generation</Text>}
        {(activeWorkflow.autoMap.checkpoints.length > 0 || activeWorkflow.autoMap.ggufs.length > 0) && (
          <BlurView intensity={120} tint="dark" style={styles.glassCard}>
            {activeWorkflow.autoMap.checkpoints.map(id => (
              <View key={`ckpt_${id}`} style={{ marginBottom: 10 }}>
                <Text style={styles.label}>MODEL</Text>
                <CustomGlassPicker
                  selectedValue={autoValues[`${id}|ckpt_name`]}
                  onValueChange={(v) => updateAutoValue(`${id}|ckpt_name`, v)}
                  items={[{ label: "Default Checkpoint", value: "" }, ...checkpoints.map(c => ({ label: c, value: c }))]}
                  placeholder="Select Checkpoint"
                />
              </View>
            ))}
            {activeWorkflow.autoMap.ggufs.map(id => (
              <View key={`gguf_${id}`} style={{ marginBottom: 10 }}>
                <Text style={styles.label}>GGUF MODEL</Text>
                <CustomGlassPicker
                  selectedValue={autoValues[`${id}|unet_name`]}
                  onValueChange={(v) => updateAutoValue(`${id}|unet_name`, v)}
                  items={[{ label: "Default GGUF", value: "" }, ...ggufs.map(c => ({ label: c, value: c }))]}
                  placeholder="Select GGUF Model"
                />
              </View>
            ))}
          </BlurView>
        )}

        {activeWorkflow.autoMap.loadImages && activeWorkflow.autoMap.loadImages.length > 0 && <Text style={styles.sectionHeader}>Image Inputs</Text>}
        {activeWorkflow.autoMap.loadImages && activeWorkflow.autoMap.loadImages.map(id => (
          <BlurView intensity={120} tint="dark" style={styles.glassCard} key={`img_${id}`}>
            <Text style={styles.label}>INPUT IMAGE</Text>
            {autoValues[`${id}|image`] ? (
              <View>
                <Image source={{ uri: autoValues[`${id}|image`].startsWith('file://') ? autoValues[`${id}|image`] : `http://${getCleanIP()}/view?filename=${autoValues[`${id}|image`]}&type=input` }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 10 }} resizeMode="cover" />
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginRight: 5, backgroundColor: '#333' }]} onPress={() => updateAutoValue(`${id}|image`, "")}><Text style={styles.primaryBtnText}>Clear</Text></TouchableOpacity>
                  <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginLeft: 5 }]} onPress={async () => {
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
                    if (!result.canceled && result.assets[0]) updateAutoValue(`${id}|image`, result.assets[0].uri);
                  }}><Text style={styles.primaryBtnText}>Change</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#333', paddingVertical: 30 }]} onPress={async () => {
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
                if (!result.canceled && result.assets[0]) updateAutoValue(`${id}|image`, result.assets[0].uri);
              }}>
                <Ionicons name="image-outline" size={32} color="#888" />
                <Text style={[styles.primaryBtnText, { color: '#888', marginTop: 10 }]}>Select an Image</Text>
              </TouchableOpacity>
            )}
          </BlurView>
        ))}

        {activeWorkflow.autoMap.latents.length > 0 && <Text style={styles.sectionHeader}>Resolution</Text>}
        {activeWorkflow.autoMap.latents.map(id => (
          <BlurView intensity={120} tint="dark" style={styles.glassCard} key={`latent_${id}`}>
            <Text style={styles.label}>RESOLUTION</Text>
            <View style={{ marginBottom: 12 }}>
              <CustomGlassPicker
                selectedValue={autoValues[`${id}|res_preset`] || "custom"}
                onValueChange={(v) => {
                  let updates = { [`${id}|res_preset`]: v };
                  if (v !== "custom") {
                    const [w, h] = v.split('x');
                    updates[`${id}|width`] = w;
                    updates[`${id}|height`] = h;
                  }
                  setAutoValues(prev => ({ ...prev, ...updates }));
                }}
                items={RESOLUTIONS}
                placeholder="Select Resolution"
              />
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}><Text style={styles.label}>WIDTH</Text><TextInput style={styles.glassInput} keyboardType="numeric" value={String(autoValues[`${id}|width`] || "")} onChangeText={(t) => { updateAutoValue(`${id}|width`, t); updateAutoValue(`${id}|res_preset`, 'custom'); }} /></View>
              <View style={{ flex: 1, marginLeft: 8 }}><Text style={styles.label}>HEIGHT</Text><TextInput style={styles.glassInput} keyboardType="numeric" value={String(autoValues[`${id}|height`] || "")} onChangeText={(t) => { updateAutoValue(`${id}|height`, t); updateAutoValue(`${id}|res_preset`, 'custom'); }} /></View>
            </View>
          </BlurView>
        ))}

        {activeWorkflow.autoMap.samplers.length > 0 && <Text style={styles.sectionHeader}>Samplers</Text>}
        {activeWorkflow.autoMap.samplers.map(id => (
          <BlurView intensity={120} tint="dark" style={styles.glassCard} key={`sampler_${id}`}>
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.label}>SAMPLER</Text>
                <CustomGlassPicker
                  selectedValue={autoValues[`${id}|sampler_name`]}
                  onValueChange={(v) => updateAutoValue(`${id}|sampler_name`, v)}
                  items={samplers.map(s => ({ label: s, value: s }))}
                  placeholder="Sampler"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.label}>SCHEDULER</Text>
                <CustomGlassPicker
                  selectedValue={autoValues[`${id}|scheduler`]}
                  onValueChange={(v) => updateAutoValue(`${id}|scheduler`, v)}
                  items={schedulers.map(s => ({ label: s, value: s }))}
                  placeholder="Scheduler"
                />
              </View>
            </View>
            <Text style={styles.label}>STEPS: <Text style={{ color: '#0A84FF' }}>{autoValues[`${id}|steps`]}</Text></Text>
            <Slider minimumTrackTintColor="#0A84FF" maximumTrackTintColor="rgba(255,255,255,0.2)" thumbTintColor="#fff" style={styles.slider} minimumValue={1} maximumValue={50} step={1} value={Number(autoValues[`${id}|steps`] || 20)} onValueChange={(v) => updateAutoValue(`${id}|steps`, v)} onSlidingComplete={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
            <Text style={styles.label}>CFG: <Text style={{ color: '#0A84FF' }}>{Number(autoValues[`${id}|cfg`] || 8).toFixed(1)}</Text></Text>
            <Slider minimumTrackTintColor="#0A84FF" maximumTrackTintColor="rgba(255,255,255,0.2)" thumbTintColor="#fff" style={styles.slider} minimumValue={1} maximumValue={20} step={0.5} value={Number(autoValues[`${id}|cfg`] || 8)} onValueChange={(v) => updateAutoValue(`${id}|cfg`, v)} onSlidingComplete={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} />
            <Text style={styles.label}>SEED</Text>
            <View style={styles.seedRow}>
              <TextInput style={[styles.glassInput, { flex: 1, marginBottom: 0 }]} keyboardType="numeric" value={String(autoValues[`${id}|seed`] || "")} onChangeText={(t) => updateAutoValue(`${id}|seed`, t)} />
              <TouchableOpacity style={styles.iconBtn} onPress={() => { animate(); updateAutoValue(`${id}|seed`, getRandomSeed()); }}><Ionicons name="dice" size={24} color="#fff" /></TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, autoSeedsActive[`${id}|seed`] && styles.iconBtnActive]} onPress={() => { animate(); setAutoSeedsActive(prev => ({ ...prev, [`${id}|seed`]: !prev[`${id}|seed`] })); }}>
                <Ionicons name="sync" size={24} color={autoSeedsActive[`${id}|seed`] ? "#fff" : "#aaa"} />
                <Text style={{ fontSize: 8, color: autoSeedsActive[`${id}|seed`] ? "#fff" : "#aaa", marginTop: 2, fontWeight: 'bold' }}>AUTO</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        ))}

        {activeWorkflow.autoMap.loraSlots.length > 0 && <Text style={styles.sectionHeader}>LoRA Stack</Text>}
        {activeWorkflow.autoMap.loraSlots.length > 0 && (
          <BlurView intensity={120} tint="dark" style={styles.glassCard}>
            <View style={styles.headerRow}><Text style={[styles.label, { marginBottom: 0 }]}>LORA STACK</Text>
              {visibleLoraIndices.length < activeWorkflow.autoMap.loraSlots.length && (<TouchableOpacity onPress={addLoraSlot}><Ionicons name="add-circle" size={24} color="#0A84FF" /></TouchableOpacity>)}
            </View>
            <View style={{ height: 10 }} />
            {visibleLoraIndices.map((slotIndex) => {
              const slot = activeWorkflow.autoMap.loraSlots[slotIndex];
              return (
                <View key={`lora_${slot.nodeId}_${slot.loraKey}`} style={{ marginBottom: 15 }}>
                  <View style={styles.headerRow}>
                    <Text style={[styles.label, { color: '#ccc' }]}>SLOT {slotIndex + 1}</Text>
                    {visibleLoraIndices.length > 1 && <TouchableOpacity onPress={() => removeLoraSlot(slotIndex)}><Ionicons name="trash" size={16} color="#FF3B30" /></TouchableOpacity>}
                  </View>
                  <CustomGlassPicker
                    selectedValue={autoValues[`${slot.nodeId}|${slot.loraKey}`]}
                    onValueChange={(v) => updateAutoValue(`${slot.nodeId}|${slot.loraKey}`, v)}
                    items={[{ label: "None", value: "None" }, ...loras.map(l => ({ label: l, value: l }))]}
                    placeholder="Select LoRA"
                  />
                  {slot.weightKey && (
                    <><Text style={[styles.label, { marginTop: 5 }]}>WEIGHT: <Text style={{ color: '#0A84FF' }}>{Number(autoValues[`${slot.nodeId}|${slot.weightKey}`] || 1).toFixed(2)}</Text></Text>
                      <Slider minimumTrackTintColor="#0A84FF" maximumTrackTintColor="rgba(255,255,255,0.2)" thumbTintColor="#fff" style={styles.slider} minimumValue={-2} maximumValue={3} step={0.05} value={Number(autoValues[`${slot.nodeId}|${slot.weightKey}`] || 1)} onValueChange={(v) => updateAutoValue(`${slot.nodeId}|${slot.weightKey}`, v)} onSlidingComplete={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} /></>
                  )}
                </View>
              )
            })}
          </BlurView>
        )}

        {activeWorkflow.customInputs && activeWorkflow.customInputs.length > 0 && <Text style={styles.sectionHeader}>Custom Overrides</Text>}
        {activeWorkflow.customInputs && activeWorkflow.customInputs.length > 0 && (
          <BlurView intensity={120} tint="dark" style={styles.glassCard}>
            <Text style={[styles.label, { marginBottom: 15 }]}>CUSTOM OVERRIDES</Text>
            {activeWorkflow.customInputs.map(inp => (
              <View key={inp.id} style={{ marginBottom: 15 }}>
                {inp.type === 'slider' ? (
                  <><Text style={styles.label}>{inp.name.toUpperCase()}: <Text style={{ color: '#0A84FF' }}>{customValues[inp.id]}</Text></Text><Slider minimumTrackTintColor="#0A84FF" maximumTrackTintColor="rgba(255,255,255,0.2)" thumbTintColor="#fff" style={styles.slider} minimumValue={Number(inp.min)} maximumValue={Number(inp.max)} step={Number(inp.step)} value={Number(customValues[inp.id] || inp.min)} onValueChange={(t) => setCustomValues({ ...customValues, [inp.id]: t })} onSlidingComplete={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} /></>
                ) : ['lora', 'model', 'gguf', 'sampler', 'scheduler'].includes(inp.type) ? (
                  <>
                    <Text style={styles.label}>{inp.name.toUpperCase()}</Text>
                    <CustomGlassPicker
                      selectedValue={customValues[inp.id] || ""}
                      onValueChange={(t) => setCustomValues({ ...customValues, [inp.id]: t })}
                      items={[
                        { label: "Default/None", value: inp.type === 'lora' ? "None" : "" },
                        ...(inp.type === 'lora' ? loras : inp.type === 'gguf' ? ggufs : inp.type === 'sampler' ? samplers : inp.type === 'scheduler' ? schedulers : checkpoints).map(x => ({ label: x, value: x }))
                      ]}
                      placeholder={`Select ${inp.name}`}
                    />
                  </>
                ) : inp.type === 'seed' ? (
                  <><Text style={styles.label}>{inp.name.toUpperCase()}</Text>
                    <View style={styles.seedRow}>
                      <TextInput style={[styles.glassInput, { flex: 1, marginBottom: 0 }]} keyboardType="numeric" value={String(customValues[inp.id] || "")} onChangeText={(t) => setCustomValues({ ...customValues, [inp.id]: t })} />
                      <TouchableOpacity style={styles.iconBtn} onPress={() => setCustomValues({ ...customValues, [inp.id]: getRandomSeed() })}><Ionicons name="dice" size={24} color="#fff" /></TouchableOpacity>
                      <TouchableOpacity style={[styles.iconBtn, customAutoSeeds[inp.id] && styles.iconBtnActive]} onPress={() => setCustomAutoSeeds({ ...customAutoSeeds, [inp.id]: !customAutoSeeds[inp.id] })}>
                        <Ionicons name="sync" size={24} color={customAutoSeeds[inp.id] ? "#fff" : "#aaa"} /><Text style={{ fontSize: 8, color: customAutoSeeds[inp.id] ? "#fff" : "#aaa", marginTop: 2, fontWeight: 'bold' }}>AUTO</Text>
                      </TouchableOpacity>
                    </View></>
                ) : (
                  <><Text style={styles.label}>{inp.name.toUpperCase()}</Text><TextInput style={[styles.glassInput, inp.type === 'text' && { height: 60 }]} multiline={inp.type === 'text'} keyboardType={inp.type === 'number' ? 'numeric' : 'default'} value={String(customValues[inp.id] || "")} onChangeText={(t) => setCustomValues({ ...customValues, [inp.id]: t })} /></>
                )}
              </View>
            ))}
          </BlurView>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* BACKGROUND LAYER - FIXED RESIZE MODE */}
      {imageUrl ? (
        <View style={StyleSheet.absoluteFill} {...pinchResponder.panHandlers}>
          <Image source={{ uri: imageUrl }} style={[StyleSheet.absoluteFillObject, { transform: [{ scale: imgScale }, { translateX: panOffset.x / imgScale }, { translateY: panOffset.y / imgScale }] }]} resizeMode="contain" />
        </View>
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#111' }]} />
      )}

      {/* NO OVERLAY TINT - Image is 100% brightness */}

      {/* TOP BAR */}
      <BlurView intensity={70} tint="dark" style={styles.topBar}>
        <TouchableOpacity style={styles.topBtn} onPress={() => { animate(); setIsMenuOpen(true); }}><Ionicons name="menu" size={28} color="#fff" /></TouchableOpacity>
        <View style={styles.progressWrapper}>{isGenerating && (<View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>)}</View>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.topBtn, { marginRight: 10 }]} onPress={shareImg}><Ionicons name="share-outline" size={24} color="#fff" /></TouchableOpacity>
          <TouchableOpacity style={styles.topBtn} onPress={saveToGallery}><Ionicons name="download-outline" size={24} color="#fff" /></TouchableOpacity>
        </View>
      </BlurView>

      {/* OPTIONS PANEL */}
      {showOptions && (
        <>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.5)' }]} />
          <ScrollView style={StyleSheet.absoluteFillObject} contentContainerStyle={{ paddingTop: 100, paddingHorizontal: 16 }}>{renderInputs()}</ScrollView>
        </>
      )}

      {toastMsg !== "" && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {/* BOTTOM BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.roundGlassBtn} onPress={toggleOptions}><Ionicons name={showOptions ? "chevron-down" : "chevron-up"} size={28} color="#0A84FF" /></TouchableOpacity>
        <TouchableOpacity style={styles.playBtn} onPress={generateImage} disabled={isGenerating}>{isGenerating ? <ActivityIndicator color="#fff" /> : <Ionicons name="play" size={28} color="#fff" style={{ marginLeft: 4 }} />}</TouchableOpacity>
      </View>



      {/* MENU MODAL (SOLID DARK) */}
      <Modal visible={isMenuOpen} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: '#111', paddingTop: 60, paddingHorizontal: 20 }}>
          <View style={styles.headerRow}>
            <View style={styles.segmentedControl}>
              <TouchableOpacity style={[styles.segment, menuTab === 'workflows' && styles.segmentActive]} onPress={() => { animate(); setMenuTab('workflows'); }}><Text style={[styles.segmentText, menuTab === 'workflows' && styles.segmentTextActive]}>Workflows</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.segment, menuTab === 'history' && styles.segmentActive]} onPress={() => { animate(); setMenuTab('history'); }}><Text style={[styles.segmentText, menuTab === 'history' && styles.segmentTextActive]}>History</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.segment, menuTab === 'settings' && styles.segmentActive]} onPress={() => { animate(); setMenuTab('settings'); }}><Text style={[styles.segmentText, menuTab === 'settings' && styles.segmentTextActive]}>Settings</Text></TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => { animate(); setIsMenuOpen(false); }}><Ionicons name="close-circle" size={32} color="#888" /></TouchableOpacity>
          </View>
          {menuTab === 'workflows' ? (
            <View style={{ flex: 1 }}>
              <TouchableOpacity style={styles.primaryBtn} onPress={openAddModal}><Text style={styles.primaryBtnText}>+ Create New Workflow</Text></TouchableOpacity>
              <ScrollView style={{ marginTop: 20 }}>
                {savedWorkflows.length === 0 ? <Text style={styles.emptyText}>No workflows yet.</Text> : savedWorkflows.map((wf) => (
                  <View key={wf.id} style={[styles.wfCard, activeWorkflow?.id === wf.id && styles.wfCardActive]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => handleSelectWorkflow(wf)} onLongPress={() => Alert.alert("Delete", `Remove ${wf.name}?`, [{ text: "Cancel" }, { text: "Delete", style: "destructive", onPress: () => deleteWorkflow(wf.id) }])}>
                      <Text style={styles.wfCardTitle}>{wf.name}</Text>
                      <Text style={styles.wfCardSub}>{wf.customInputs.length} Overrides</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ padding: 10 }} onPress={() => openEditModal(wf)}><Ionicons name="pencil" size={20} color="#888" /></TouchableOpacity>
                    <Ionicons name="checkmark-circle" size={24} color={activeWorkflow?.id === wf.id ? "#0A84FF" : "transparent"} />
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : menuTab === 'history' ? (
            <View style={{ flex: 1, marginTop: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <Text style={styles.label}>Recent Generations</Text>
                {history.length > 0 && (
                  <TouchableOpacity onPress={() => Alert.alert("Clear History", "Are you sure you want to delete all history?", [{ text: "Cancel" }, { text: "Clear", style: "destructive", onPress: async () => { animate(); setHistory([]); await AsyncStorage.removeItem('glassHistory'); } }])}>
                    <Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: 'bold' }}>Clear All</Text>
                  </TouchableOpacity>
                )}
              </View>
              {history.length === 0 ? <Text style={styles.emptyText}>No history yet.</Text> : (
                <FlatList
                  data={history}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  numColumns={2}
                  columnWrapperStyle={{ justifyContent: 'space-between' }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={{ width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 15 }} onPress={() => setSelectedHistory(item)}>
                      <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} />
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          ) : (
            <View style={{ flex: 1, marginTop: 20 }}>
              <View style={styles.card}>
                <Text style={styles.label}>ComfyUI Server IP</Text>
                <TextInput style={styles.glassInput} value={serverIP} onChangeText={setServerIP} placeholderTextColor="#888" placeholder="192.168.1.100:8188" />
                <TouchableOpacity style={[styles.primaryBtn, { marginTop: 15 }]} onPress={() => { AsyncStorage.setItem('comfyIP', serverIP); showToast("Saved"); }}><Text style={styles.primaryBtnText}>Save Settings</Text></TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333', marginTop: 10 }]} onPress={() => { animate(); setIsTutorialVisible(true); setTutorialStep(0); }}>
                <Text style={[styles.primaryBtnText, { color: '#0A84FF' }]}>📖 How to use the app</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333', marginTop: 10 }]} onPress={() => setIsDonationVisible(true)}>
                <Text style={[styles.primaryBtnText, { color: '#32CD32' }]}>💸 Donate</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* WORKFLOW BUILDER MODAL (SOLID DARK) */}
      <Modal visible={isWfModalVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, backgroundColor: '#111' }}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <View style={styles.headerRow}><Text style={styles.title}>{editingWfId ? "Edit Workflow" : "New Workflow"}</Text><TouchableOpacity onPress={() => setIsWfModalVisible(false)}><Ionicons name="close-circle" size={32} color="#888" /></TouchableOpacity></View>

              <View style={styles.card}><Text style={styles.label}>Name</Text><TextInput style={styles.glassInput} placeholderTextColor="#888" placeholder="e.g. SDXL Base" value={wfName} onChangeText={setWfName} /></View>
              <View style={styles.card}>
                <Text style={styles.label}>API JSON Code</Text>
                <TextInput style={[styles.glassInput, { height: 150, textAlignVertical: 'top' }]} multiline value={wfJson} onChangeText={setWfJson} placeholderTextColor="#888" />
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#333' }]} onPress={() => analyzeJson(wfJson)}><Text style={[styles.primaryBtnText, { color: '#fff' }]}>Analyze for Auto-Detect</Text></TouchableOpacity>
              </View>

              {(autoMapDraft.samplers.length > 0 || autoMapDraft.prompts.length > 0 || autoMapDraft.loraSlots.length > 0 || (autoMapDraft.loadImages && autoMapDraft.loadImages.length > 0)) && (
                <View style={styles.card}>
                  <Text style={[styles.label, { color: '#fff', fontSize: 16 }]}>Auto-Detected Nodes</Text>
                  {['samplers', 'prompts', 'checkpoints', 'ggufs', 'latents', 'loadImages'].map(category => (
                    autoMapDraft[category] && autoMapDraft[category].length > 0 && autoMapDraft[category].map((id, index) => (
                      <View key={`${category}_${id}`} style={styles.rowItemClear}>
                        <Text style={{ color: '#aaa', flex: 1 }}>{category.toUpperCase()} (Node {id})</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {index > 0 && (
                            <TouchableOpacity onPress={() => moveAutoDraftItem(category, index, 'up')} style={{ marginRight: 10 }}>
                              <Ionicons name="arrow-up-circle" size={24} color="#0A84FF" />
                            </TouchableOpacity>
                          )}
                          {index < autoMapDraft[category].length - 1 && (
                            <TouchableOpacity onPress={() => moveAutoDraftItem(category, index, 'down')} style={{ marginRight: 15 }}>
                              <Ionicons name="arrow-down-circle" size={24} color="#0A84FF" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity onPress={() => removeAutoDraftItem(category, id)}><Ionicons name="close-circle" size={24} color="#FF3B30" /></TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ))}
                  {autoMapDraft.loraSlots && autoMapDraft.loraSlots.map((slot, index) => (
                    <View key={`lora_${slot.nodeId}_${slot.loraKey}`} style={styles.rowItemClear}>
                      <Text style={{ color: '#aaa', flex: 1 }}>LORA SLOT (Node {slot.nodeId})</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {index > 0 && (
                          <TouchableOpacity onPress={() => moveAutoDraftItem('loraSlots', index, 'up')} style={{ marginRight: 10 }}>
                            <Ionicons name="arrow-up-circle" size={24} color="#0A84FF" />
                          </TouchableOpacity>
                        )}
                        {index < autoMapDraft.loraSlots.length - 1 && (
                          <TouchableOpacity onPress={() => moveAutoDraftItem('loraSlots', index, 'down')} style={{ marginRight: 15 }}>
                            <Ionicons name="arrow-down-circle" size={24} color="#0A84FF" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => removeAutoDraftItem('loraSlots', slot)}><Ionicons name="close-circle" size={24} color="#FF3B30" /></TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.headerRow}><Text style={[styles.label, { color: '#fff', fontSize: 16 }]}>Custom Placeholders</Text><TouchableOpacity onPress={() => { setEditingInputId(null); setInputName(''); setInputTrigger(''); setInputType('slider'); setSliderMin('0'); setSliderMax('1'); setSliderStep('0.1'); setIsInputModalVisible(true); }}><Ionicons name="add-circle" size={32} color="#0A84FF" /></TouchableOpacity></View>
              {customInputs.map((inp, idx) => (
                <View key={inp.id || idx} style={[styles.card, { padding: 12, flexDirection: 'row', alignItems: 'center' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>{inp.name} <Text style={{ color: '#888' }}>({inp.type})</Text></Text>
                    <Text style={{ color: '#0A84FF', fontSize: 12 }}>Trigger: {inp.trigger}</Text>
                  </View>
                  <TouchableOpacity style={{ padding: 8 }} onPress={() => editCustomPlaceholder(inp)}><Ionicons name="pencil" size={18} color="#0A84FF" /></TouchableOpacity>
                  <TouchableOpacity style={{ padding: 8 }} onPress={() => removeCustomPlaceholder(inp.id)}><Ionicons name="trash" size={18} color="#FF3B30" /></TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={saveWorkflow}><Text style={styles.primaryBtnText}>Save Workflow</Text></TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ADD CUSTOM MODAL (SOLID DARK) */}
      <Modal visible={isInputModalVisible} animationType="fade" transparent={true}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView behavior="padding" style={styles.popup}>
            <Text style={[styles.title, { fontSize: 20, marginBottom: 15 }]}>{editingInputId ? 'Edit Placeholder' : 'New Placeholder'}</Text>
            <Text style={styles.label}>UI Display Name</Text><TextInput style={styles.glassInput} placeholderTextColor="#888" placeholder="e.g. Seed Override" value={inputName} onChangeText={setInputName} />
            <Text style={styles.label}>JSON Trigger Word (Quote it!)</Text><TextInput style={styles.glassInput} placeholderTextColor="#888" placeholder='e.g. "%seed%"' value={inputTrigger} onChangeText={setInputTrigger} />
            <Text style={styles.label}>Input Type</Text>
            <View style={{ marginBottom: 12 }}>
              <CustomGlassPicker
                selectedValue={inputType}
                onValueChange={(val) => { animate(); setInputType(val); }}
                items={[
                  { label: "Text Box (Multi-line)", value: "text" },
                  { label: "Text Box (Single-line)", value: "string" },
                  { label: "Number Box", value: "number" },
                  { label: "Slider", value: "slider" },
                  { label: "Seed Box", value: "seed" },
                  { label: "LoRA Dropdown", value: "lora" },
                  { label: "Checkpoint Dropdown", value: "model" },
                  { label: "GGUF Dropdown", value: "gguf" },
                  { label: "Sampler Dropdown", value: "sampler" },
                  { label: "Scheduler Dropdown", value: "scheduler" }
                ]}
                placeholder="Select Input Type"
              />
            </View>
            {inputType === 'slider' && (
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 5 }}><Text style={styles.label}>Min</Text><TextInput style={styles.glassInput} keyboardType="numeric" value={sliderMin} onChangeText={setSliderMin} /></View>
                <View style={{ flex: 1, marginHorizontal: 5 }}><Text style={styles.label}>Max</Text><TextInput style={styles.glassInput} keyboardType="numeric" value={sliderMax} onChangeText={setSliderMax} /></View>
                <View style={{ flex: 1, marginLeft: 5 }}><Text style={styles.label}>Step</Text><TextInput style={styles.glassInput} keyboardType="numeric" value={sliderStep} onChangeText={setSliderStep} /></View>
              </View>
            )}
            <View style={[styles.row, { marginTop: 20 }]}><TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginRight: 5, backgroundColor: '#333' }]} onPress={() => setIsInputModalVisible(false)}><Text style={styles.primaryBtnText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginLeft: 5 }]} onPress={saveCustomPlaceholder}><Text style={styles.primaryBtnText}>Add</Text></TouchableOpacity></View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* HISTORY DETAILS MODAL */}
      <Modal visible={!!selectedHistory} animationType="slide" transparent={true}>
        {selectedHistory && (
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <Image source={{ uri: selectedHistory.imageUrl }} style={{ width: '100%', height: '60%' }} resizeMode="contain" />
            <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }} onPress={() => setSelectedHistory(null)}>
              <Ionicons name="close-circle" size={36} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={{ position: 'absolute', top: 50, right: 70, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 6 }}
              onPress={() => Alert.alert("Delete", "Remove this image from history?", [{ text: "Cancel" }, {
                text: "Delete", style: "destructive", onPress: async () => {
                  const updated = history.filter(h => h.id !== selectedHistory.id);
                  animate();
                  setHistory(updated);
                  await AsyncStorage.setItem('glassHistory', JSON.stringify(updated));
                  setSelectedHistory(null);
                }
              }])}>
              <Ionicons name="trash" size={24} color="#FF3B30" />
            </TouchableOpacity>
            <ScrollView style={{ flex: 1, backgroundColor: '#111', padding: 20 }}>
              <Text style={[styles.title, { marginBottom: 15 }]}>Generation Info</Text>
              <Text style={{ color: '#888', marginBottom: 20 }}>{new Date(selectedHistory.date).toLocaleString()}</Text>

              {Object.keys(selectedHistory.prompt).map(nodeId => {
                const node = selectedHistory.prompt[nodeId];
                if (!node || !node.inputs) return null;
                if (node.class_type === 'CLIPTextEncode') {
                  return <View key={nodeId} style={styles.card}><Text style={styles.label}>PROMPT</Text><Text style={{ color: '#fff' }}>{node.inputs.text}</Text></View>;
                }
                if (node.class_type.includes('KSampler')) {
                  return <View key={nodeId} style={styles.card}><Text style={styles.label}>SAMPLER INFO</Text>
                    <Text style={{ color: '#ccc' }}>Seed: {node.inputs.seed}</Text>
                    <Text style={{ color: '#ccc' }}>Steps: {node.inputs.steps}</Text>
                    <Text style={{ color: '#ccc' }}>CFG: {node.inputs.cfg}</Text>
                    <Text style={{ color: '#ccc' }}>Sampler: {node.inputs.sampler_name}</Text>
                    <Text style={{ color: '#ccc' }}>Scheduler: {node.inputs.scheduler}</Text>
                  </View>
                }
                if (node.class_type === 'CheckpointLoaderSimple') {
                  return <View key={nodeId} style={styles.card}><Text style={styles.label}>MODEL</Text><Text style={{ color: '#fff' }}>{node.inputs.ckpt_name}</Text></View>;
                }
                if (node.class_type.includes('LoraLoader')) {
                  return <View key={nodeId} style={styles.card}><Text style={styles.label}>LORA</Text><Text style={{ color: '#fff' }}>{node.inputs.lora_name}</Text></View>;
                }
                return null;
              })}
              <View style={{ height: 50 }} />
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* TUTORIAL MODAL */}
      <Modal visible={isTutorialVisible} animationType="fade" transparent={true}>
        <View style={styles.overlay}>
          <View style={[styles.popup, { width: '95%', paddingVertical: 30 }]}>
            {tutorialStep === 0 && (
              <View>
                <Text style={[styles.title, { marginBottom: 15, fontSize: 24 }]}>1. Server Setup</Text>
                <Text style={styles.tutorialText}>Open an empty workflow inside ComfyUI and make sure your server is running.</Text>
                <Text style={styles.tutorialText}>You MUST use the <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>--listen</Text> flag (e.g. <Text style={{ fontFamily: 'monospace', backgroundColor: '#333', padding: 2 }}>python main.py --listen</Text>) so the app can connect.</Text>
                <Text style={styles.tutorialText}>Go back to the <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>Settings</Text> tab in this app and enter your Local IP Address plus Port (usually 8188).</Text>
              </View>
            )}
            {tutorialStep === 1 && (
              <View>
                <Text style={[styles.title, { marginBottom: 15, fontSize: 24 }]}>2. Workflow API Format</Text>
                <Text style={styles.tutorialText}>In ComfyUI desktop, click the <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>Settings (Gear icon)</Text>.</Text>
                <Text style={styles.tutorialText}>Enable the <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>Enable Dev mode Options</Text> checkbox.</Text>
                <Text style={styles.tutorialText}>You will now see a new button on the menu called <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>Save (API format)</Text>. Use this to download the special JSON file you need.</Text>
              </View>
            )}
            {tutorialStep === 2 && (
              <View>
                <Text style={[styles.title, { marginBottom: 15, fontSize: 24 }]}>3. Importing to App</Text>
                <Text style={styles.tutorialText}>Open the <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>Workflows</Text> tab in this app and press <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>+ Create New Workflow</Text>.</Text>
                <Text style={styles.tutorialText}>Give it a name, and paste your saved JSON code into the <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>API JSON Code</Text> text box.</Text>
                <Text style={styles.tutorialText}>Press <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>Analyze for Auto-Detect</Text>. Look at the node numbers to identify which prompt is positive/negative and which image is which!</Text>
                <Text style={styles.tutorialText}>You can change the order of the auto-detected nodes using the up/down arrows so they render in your preferred layout. Then <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>Save Workflow</Text>.</Text>
              </View>
            )}
            {tutorialStep === 3 && (
              <View>
                <Text style={[styles.title, { marginBottom: 15, fontSize: 24 }]}>4. Custom Overrides</Text>
                <Text style={styles.tutorialText}>Want custom controls? Replace a value in your ComfyUI strings right before saving with a magic string, like <Text style={{ fontFamily: 'monospace', color: '#0A84FF' }}>"%my_seed%"</Text> or <Text style={{ fontFamily: 'monospace', color: '#0A84FF' }}>"%style%"</Text>.</Text>
                <Text style={styles.tutorialText}>When making the workflow in the app, add a <Text style={{ color: '#0A84FF', fontWeight: 'bold' }}>Custom Placeholder</Text>. Put your exact magic string in the Trigger Word box (include the quotes).</Text>
                <Text style={styles.tutorialText}>Now when you generate, the app swaps your UI input straight into the workflow!</Text>
              </View>
            )}
            <View style={[styles.row, { marginTop: 30, justifyContent: 'space-between' }]}>
              {tutorialStep > 0 ? (
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#333', paddingVertical: 12, paddingHorizontal: 20 }]} onPress={() => setTutorialStep(tutorialStep - 1)}>
                  <Text style={styles.primaryBtnText}>Back</Text>
                </TouchableOpacity>
              ) : <View style={{ width: 80 }} />}

              <View style={styles.row}>
                {[0, 1, 2, 3].map(dot => (
                  <View key={`dot_${dot}`} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tutorialStep === dot ? '#0A84FF' : '#444', marginHorizontal: 4 }} />
                ))}
              </View>

              {tutorialStep < 3 ? (
                <TouchableOpacity style={[styles.primaryBtn, { paddingVertical: 12, paddingHorizontal: 20 }]} onPress={() => setTutorialStep(tutorialStep + 1)}>
                  <Text style={styles.primaryBtnText}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.primaryBtn, { paddingVertical: 12, paddingHorizontal: 20 }]} onPress={closeTutorial}>
                  <Text style={styles.primaryBtnText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity style={{ position: 'absolute', top: 15, right: 15 }} onPress={closeTutorial}>
              <Ionicons name="close-circle" size={28} color="#888" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DONATION MODAL */}
      <Modal visible={isDonationVisible} animationType="fade" transparent={true}>
        <View style={styles.overlay}>
          <View style={[styles.popup, { width: '90%', paddingVertical: 35 }]}>
            <Text style={[styles.title, { marginBottom: 15, fontSize: 24, textAlign: 'center', color: '#fff' }]}>Support the Creator</Text>
            <Text style={[styles.tutorialText, { textAlign: 'center' }]}>
              This app is open source and free forever. If you want to help me keep updating it, please consider donating at:
            </Text>

            <TouchableOpacity style={[styles.card, { backgroundColor: '#1A1A1A', padding: 15, marginBottom: 15, alignItems: 'center' }]} onPress={() => Linking.openURL('https://ko-fi.com/kasumaoniisan')}>
              <Text style={{ color: '#0A84FF', fontSize: 18, fontWeight: 'bold' }}>Ko-fi (Buy me a coffee)</Text>
              <Text style={{ color: '#888', fontSize: 14, marginTop: 4 }}>ko-fi.com/kasumaoniisan</Text>
            </TouchableOpacity>

            <View style={[styles.card, { backgroundColor: '#1A1A1A', padding: 15, marginBottom: 25 }]}>
              <Text style={{ color: '#aaa', fontSize: 14, marginBottom: 5, textAlign: 'center' }}>Crypto (LTC):</Text>
              <Text selectable={true} style={{ color: '#32CD32', fontSize: 13, fontFamily: 'monospace', textAlign: 'center', backgroundColor: '#000', padding: 10, borderRadius: 8 }}>
                LSjf1DczHxs3GEbkoMmi1UWH2GikmXDtis
              </Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setIsDonationVisible(false)}>
              <Text style={styles.primaryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  row: { flexDirection: 'row', alignItems: 'center' },

  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 90, paddingTop: 40, paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 },
  topBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  progressWrapper: { flex: 1, marginHorizontal: 20, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  progressTrack: { flex: 1 },
  progressFill: { height: '100%', backgroundColor: '#0A84FF' },

  bottomBar: { position: 'absolute', bottom: 30, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 },
  roundGlassBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(10, 132, 255, 0.2)', borderWidth: 1, borderColor: 'rgba(10, 132, 255, 0.5)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  playBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#0A84FF', justifyContent: 'center', alignItems: 'center', shadowColor: '#0A84FF', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5 },

  glassCard: { padding: 20, borderRadius: 24, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  card: { backgroundColor: '#1C1C1E', padding: 20, borderRadius: 24, marginBottom: 16 },
  sectionHeader: { fontSize: 13, fontWeight: 'bold', color: '#0A84FF', marginLeft: 8, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, marginTop: 10 },
  label: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  glassInput: { backgroundColor: 'rgba(0,0,0,0.4)', color: '#fff', padding: 14, borderRadius: 12, fontSize: 15, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  glassPickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  glassPickerText: { color: '#fff', fontSize: 15, flex: 1, marginRight: 10 },
  pickerModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerModalContent: { backgroundColor: '#1C1C1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%', paddingBottom: Platform.OS === 'ios' ? 40 : 20, borderWidth: 1, borderColor: '#333' },
  pickerModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#333', marginBottom: 10 },
  pickerModalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  pickerItemSelected: { backgroundColor: 'rgba(10, 132, 255, 0.1)', borderRadius: 12, paddingHorizontal: 10, borderBottomWidth: 0 },
  pickerItemText: { color: '#fff', fontSize: 16 },
  pickerItemTextSelected: { color: '#0A84FF', fontWeight: 'bold' },
  pickerHeaderItem: { paddingVertical: 12, marginTop: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  pickerHeaderText: { color: '#888', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  slider: { width: '100%', height: 40, marginTop: 4, marginBottom: 12 },

  seedRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { backgroundColor: 'rgba(0,0,0,0.4)', width: 48, height: 48, borderRadius: 12, marginLeft: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  iconBtnActive: { backgroundColor: '#0A84FF', borderColor: '#0A84FF' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  segmentedControl: { flexDirection: 'row', backgroundColor: '#333', padding: 4, borderRadius: 14, flex: 1, marginRight: 15 },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  segmentActive: { backgroundColor: '#555' },
  segmentText: { color: '#888', fontSize: 14, fontWeight: '600' },
  segmentTextActive: { color: '#fff' },

  wfCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1C1C1E', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#333' },
  wfCardActive: { borderColor: '#0A84FF' },
  wfCardTitle: { fontSize: 17, fontWeight: '600', color: '#fff', marginBottom: 4 },
  wfCardSub: { fontSize: 13, color: '#888' },

  primaryBtn: { backgroundColor: '#0A84FF', padding: 16, borderRadius: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  modalScroll: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  popup: { width: '90%', backgroundColor: '#1C1C1E', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#333' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  rowItemClear: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  emptyText: { textAlign: 'center', color: '#666', fontSize: 16, padding: 20 },
  workflowTitleBadge: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', marginBottom: 12, marginLeft: 4, letterSpacing: 1 },
  toast: { position: 'absolute', bottom: 120, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.8)', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 20, zIndex: 999, borderWidth: 1, borderColor: '#333' },
  toastText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  tutorialText: { color: '#ccc', fontSize: 16, lineHeight: 24, marginBottom: 15 }
});