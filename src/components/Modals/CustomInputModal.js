import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, LayoutAnimation } from 'react-native';
import { globalStyles as styles } from '../../styles/globalStyles';
import { CustomGlassPicker } from '../CustomGlassPicker';

export const CustomInputModal = ({ visible, editingInputId, inputName, setInputName, inputTrigger, setInputTrigger, inputType, setInputType, sliderMin, setSliderMin, sliderMax, setSliderMax, sliderStep, setSliderStep, onSave, onClose }) => {
  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior="padding" style={styles.popup}>
          <Text style={[styles.title, { fontSize: 20, marginBottom: 15 }]}>{editingInputId ? 'Edit Placeholder' : 'New Placeholder'}</Text>
          <Text style={styles.label}>UI Display Name</Text>
          <TextInput style={styles.glassInput} placeholderTextColor="#888" placeholder="e.g. Seed Override" value={inputName} onChangeText={setInputName} />
          <Text style={styles.label}>JSON Trigger Word (Quote it!)</Text>
          <TextInput style={styles.glassInput} placeholderTextColor="#888" placeholder='e.g. "%seed%"' value={inputTrigger} onChangeText={setInputTrigger} />
          <Text style={styles.label}>Input Type</Text>
          <View style={{ marginBottom: 12 }}>
            <CustomGlassPicker selectedValue={inputType} onValueChange={(val) => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setInputType(val); }} items={[{ label: "Text Box (Multi-line)", value: "text" }, { label: "Text Box (Single-line)", value: "string" }, { label: "Number Box", value: "number" }, { label: "Slider", value: "slider" }, { label: "Seed Box", value: "seed" }, { label: "LoRA Dropdown", value: "lora" }, { label: "Checkpoint Dropdown", value: "model" }, { label: "GGUF Dropdown", value: "gguf" }, { label: "Sampler Dropdown", value: "sampler" }, { label: "Scheduler Dropdown", value: "scheduler" }]} placeholder="Select Input Type" />
          </View>
          {inputType === 'slider' && (
            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 5 }}><Text style={styles.label}>Min</Text><TextInput style={styles.glassInput} keyboardType="numeric" value={sliderMin} onChangeText={setSliderMin} /></View>
              <View style={{ flex: 1, marginHorizontal: 5 }}><Text style={styles.label}>Max</Text><TextInput style={styles.glassInput} keyboardType="numeric" value={sliderMax} onChangeText={setSliderMax} /></View>
              <View style={{ flex: 1, marginLeft: 5 }}><Text style={styles.label}>Step</Text><TextInput style={styles.glassInput} keyboardType="numeric" value={sliderStep} onChangeText={setSliderStep} /></View>
            </View>
          )}
          <View style={[styles.row, { marginTop: 20 }]}><TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginRight: 5, backgroundColor: '#333' }]} onPress={onClose}><Text style={styles.primaryBtnText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginLeft: 5 }]} onPress={onSave}><Text style={styles.primaryBtnText}>{editingInputId ? 'Save' : 'Add'}</Text></TouchableOpacity></View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};