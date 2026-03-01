import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { globalStyles as styles } from '../../styles/globalStyles';

export const WorkflowBuilderModal = ({ isWfModalVisible, setIsWfModalVisible, editingWfId, wfName, setWfName, wfJson, setWfJson, analyzeJson, autoMapDraft, moveAutoDraftItem, removeAutoDraftItem, customInputs, removeCustomPlaceholder, editCustomPlaceholder, setEditingInputId, setInputName, setInputTrigger, setInputType, setSliderMin, setSliderMax, setSliderStep, setIsInputModalVisible, saveWorkflow }) => {
  return (
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
                        {index > 0 && (<TouchableOpacity onPress={() => moveAutoDraftItem(category, index, 'up')} style={{ marginRight: 10 }}><Ionicons name="arrow-up-circle" size={24} color="#0A84FF" /></TouchableOpacity>)}
                        {index < autoMapDraft[category].length - 1 && (<TouchableOpacity onPress={() => moveAutoDraftItem(category, index, 'down')} style={{ marginRight: 15 }}><Ionicons name="arrow-down-circle" size={24} color="#0A84FF" /></TouchableOpacity>)}
                        <TouchableOpacity onPress={() => removeAutoDraftItem(category, id)}><Ionicons name="close-circle" size={24} color="#FF3B30" /></TouchableOpacity>
                      </View>
                    </View>
                  ))
                ))}
                {autoMapDraft.loraSlots && autoMapDraft.loraSlots.map((slot, index) => (
                  <View key={`lora_${slot.nodeId}_${slot.loraKey}`} style={styles.rowItemClear}>
                    <Text style={{ color: '#aaa', flex: 1 }}>LORA SLOT (Node {slot.nodeId})</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {index > 0 && (<TouchableOpacity onPress={() => moveAutoDraftItem('loraSlots', index, 'up')} style={{ marginRight: 10 }}><Ionicons name="arrow-up-circle" size={24} color="#0A84FF" /></TouchableOpacity>)}
                      {index < autoMapDraft.loraSlots.length - 1 && (<TouchableOpacity onPress={() => moveAutoDraftItem('loraSlots', index, 'down')} style={{ marginRight: 15 }}><Ionicons name="arrow-down-circle" size={24} color="#0A84FF" /></TouchableOpacity>)}
                      <TouchableOpacity onPress={() => removeAutoDraftItem('loraSlots', slot)}><Ionicons name="close-circle" size={24} color="#FF3B30" /></TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.headerRow}><Text style={[styles.label, { color: '#fff', fontSize: 16 }]}>Custom Placeholders</Text><TouchableOpacity onPress={() => { setEditingInputId(null); setInputName(''); setInputTrigger(''); setInputType('slider'); setSliderMin('0'); setSliderMax('1'); setSliderStep('0.1'); setIsInputModalVisible(true); }}><Ionicons name="add-circle" size={32} color="#0A84FF" /></TouchableOpacity></View>
            {customInputs.map((inp, idx) => (
              <View key={inp.id || idx} style={[styles.card, { padding: 12, flexDirection: 'row', alignItems: 'center' }]}>
                <View style={{ flex: 1 }}><Text style={{ color: '#fff', fontWeight: 'bold' }}>{inp.name} <Text style={{ color: '#888' }}>({inp.type})</Text></Text><Text style={{ color: '#0A84FF', fontSize: 12 }}>Trigger: {inp.trigger}</Text></View>
                <TouchableOpacity style={{ padding: 8 }} onPress={() => editCustomPlaceholder(inp)}><Ionicons name="pencil" size={18} color="#0A84FF" /></TouchableOpacity>
                <TouchableOpacity style={{ padding: 8 }} onPress={() => removeCustomPlaceholder(inp.id)}><Ionicons name="trash" size={18} color="#FF3B30" /></TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={saveWorkflow}><Text style={styles.primaryBtnText}>Save Workflow</Text></TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};