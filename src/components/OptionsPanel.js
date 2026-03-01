import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, LayoutAnimation } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { CustomGlassPicker } from './CustomGlassPicker';
import { globalStyles as styles } from '../styles/globalStyles';
import { RESOLUTIONS } from '../utils/constants';
import { guessPromptType, getRandomSeed, getCleanIP } from '../utils/helpers';

export const OptionsPanel = ({ activeWorkflow, autoValues, updateAutoValue, customValues, setCustomValues, autoSeedsActive, setAutoSeedsActive, customAutoSeeds, setCustomAutoSeeds, visibleLoraIndices, addLoraSlot, removeLoraSlot, checkpoints, ggufs, loras, samplers, schedulers, serverIP }) => {
  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

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
              <CustomGlassPicker selectedValue={autoValues[`${id}|ckpt_name`]} onValueChange={(v) => updateAutoValue(`${id}|ckpt_name`, v)} items={[{ label: "Default Checkpoint", value: "" }, ...checkpoints.map(c => ({ label: c, value: c }))]} placeholder="Select Checkpoint" />
            </View>
          ))}
          {activeWorkflow.autoMap.ggufs.map(id => (
            <View key={`gguf_${id}`} style={{ marginBottom: 10 }}>
              <Text style={styles.label}>GGUF MODEL</Text>
              <CustomGlassPicker selectedValue={autoValues[`${id}|unet_name`]} onValueChange={(v) => updateAutoValue(`${id}|unet_name`, v)} items={[{ label: "Default GGUF", value: "" }, ...ggufs.map(c => ({ label: c, value: c }))]} placeholder="Select GGUF Model" />
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
              <Image source={{ uri: autoValues[`${id}|image`].startsWith('file://') ? autoValues[`${id}|image`] : `http://${getCleanIP(serverIP)}/view?filename=${autoValues[`${id}|image`]}&type=input` }} style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 10 }} resizeMode="cover" />
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
            <CustomGlassPicker selectedValue={autoValues[`${id}|res_preset`] || "custom"} onValueChange={(v) => {
                let updates = { [`${id}|res_preset`]: v };
                if (v !== "custom") { const [w, h] = v.split('x'); updates[`${id}|width`] = w; updates[`${id}|height`] = h; }
                Object.keys(updates).forEach(k => updateAutoValue(k, updates[k]));
              }} items={RESOLUTIONS} placeholder="Select Resolution" />
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
            <View style={{ flex: 1, marginRight: 8 }}><Text style={styles.label}>SAMPLER</Text><CustomGlassPicker selectedValue={autoValues[`${id}|sampler_name`]} onValueChange={(v) => updateAutoValue(`${id}|sampler_name`, v)} items={samplers.map(s => ({ label: s, value: s }))} placeholder="Sampler" /></View>
            <View style={{ flex: 1, marginLeft: 8 }}><Text style={styles.label}>SCHEDULER</Text><CustomGlassPicker selectedValue={autoValues[`${id}|scheduler`]} onValueChange={(v) => updateAutoValue(`${id}|scheduler`, v)} items={schedulers.map(s => ({ label: s, value: s }))} placeholder="Scheduler" /></View>
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
          <View style={styles.headerRow}><Text style={[styles.label, { marginBottom: 0 }]}>LORA STACK</Text>{visibleLoraIndices.length < activeWorkflow.autoMap.loraSlots.length && (<TouchableOpacity onPress={addLoraSlot}><Ionicons name="add-circle" size={24} color="#0A84FF" /></TouchableOpacity>)}</View>
          <View style={{ height: 10 }} />
          {visibleLoraIndices.map((slotIndex) => {
            const slot = activeWorkflow.autoMap.loraSlots[slotIndex];
            return (
              <View key={`lora_${slot.nodeId}_${slot.loraKey}`} style={{ marginBottom: 15 }}>
                <View style={styles.headerRow}><Text style={[styles.label, { color: '#ccc' }]}>SLOT {slotIndex + 1}</Text>{visibleLoraIndices.length > 1 && <TouchableOpacity onPress={() => removeLoraSlot(slotIndex)}><Ionicons name="trash" size={16} color="#FF3B30" /></TouchableOpacity>}</View>
                <CustomGlassPicker selectedValue={autoValues[`${slot.nodeId}|${slot.loraKey}`]} onValueChange={(v) => updateAutoValue(`${slot.nodeId}|${slot.loraKey}`, v)} items={[{ label: "None", value: "None" }, ...loras.map(l => ({ label: l, value: l }))]} placeholder="Select LoRA" />
                {slot.weightKey && (<><Text style={[styles.label, { marginTop: 5 }]}>WEIGHT: <Text style={{ color: '#0A84FF' }}>{Number(autoValues[`${slot.nodeId}|${slot.weightKey}`] || 1).toFixed(2)}</Text></Text><Slider minimumTrackTintColor="#0A84FF" maximumTrackTintColor="rgba(255,255,255,0.2)" thumbTintColor="#fff" style={styles.slider} minimumValue={-2} maximumValue={3} step={0.05} value={Number(autoValues[`${slot.nodeId}|${slot.weightKey}`] || 1)} onValueChange={(v) => updateAutoValue(`${slot.nodeId}|${slot.weightKey}`, v)} onSlidingComplete={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} /></>)}
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
              {inp.type === 'slider' ? (<><Text style={styles.label}>{inp.name.toUpperCase()}: <Text style={{ color: '#0A84FF' }}>{customValues[inp.id]}</Text></Text><Slider minimumTrackTintColor="#0A84FF" maximumTrackTintColor="rgba(255,255,255,0.2)" thumbTintColor="#fff" style={styles.slider} minimumValue={Number(inp.min)} maximumValue={Number(inp.max)} step={Number(inp.step)} value={Number(customValues[inp.id] || inp.min)} onValueChange={(t) => setCustomValues({ ...customValues, [inp.id]: t })} onSlidingComplete={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)} /></>) : ['lora', 'model', 'gguf', 'sampler', 'scheduler'].includes(inp.type) ? (<><Text style={styles.label}>{inp.name.toUpperCase()}</Text><CustomGlassPicker selectedValue={customValues[inp.id] || ""} onValueChange={(t) => setCustomValues({ ...customValues, [inp.id]: t })} items={[{ label: "Default/None", value: inp.type === 'lora' ? "None" : "" }, ...(inp.type === 'lora' ? loras : inp.type === 'gguf' ? ggufs : inp.type === 'sampler' ? samplers : inp.type === 'scheduler' ? schedulers : checkpoints).map(x => ({ label: x, value: x }))]} placeholder={`Select ${inp.name}`} /></>) : inp.type === 'seed' ? (<><Text style={styles.label}>{inp.name.toUpperCase()}</Text><View style={styles.seedRow}><TextInput style={[styles.glassInput, { flex: 1, marginBottom: 0 }]} keyboardType="numeric" value={String(customValues[inp.id] || "")} onChangeText={(t) => setCustomValues({ ...customValues, [inp.id]: t })} /><TouchableOpacity style={styles.iconBtn} onPress={() => setCustomValues({ ...customValues, [inp.id]: getRandomSeed() })}><Ionicons name="dice" size={24} color="#fff" /></TouchableOpacity><TouchableOpacity style={[styles.iconBtn, customAutoSeeds[inp.id] && styles.iconBtnActive]} onPress={() => setCustomAutoSeeds({ ...customAutoSeeds, [inp.id]: !customAutoSeeds[inp.id] })}><Ionicons name="sync" size={24} color={customAutoSeeds[inp.id] ? "#fff" : "#aaa"} /><Text style={{ fontSize: 8, color: customAutoSeeds[inp.id] ? "#fff" : "#aaa", marginTop: 2, fontWeight: 'bold' }}>AUTO</Text></TouchableOpacity></View></>) : (<><Text style={styles.label}>{inp.name.toUpperCase()}</Text><TextInput style={[styles.glassInput, inp.type === 'text' && { height: 60 }]} multiline={inp.type === 'text'} keyboardType={inp.type === 'number' ? 'numeric' : 'default'} value={String(customValues[inp.id] || "")} onChangeText={(t) => setCustomValues({ ...customValues, [inp.id]: t })} /></>)}
            </View>
          ))}
        </BlurView>
      )}
    </View>
  );
};