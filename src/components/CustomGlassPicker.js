import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

export const CustomGlassPicker = ({ selectedValue, onValueChange, items, placeholder = "Select an option" }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedItem = items.find(item => item.value === selectedValue);
  const displayLabel = selectedItem ? selectedItem.label : placeholder;

  return (
    <>
      <TouchableOpacity style={styles.glassPickerBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.glassPickerText} numberOfLines={1}>{displayLabel}</Text>
        <Ionicons name="chevron-down" size={20} color="#ccc" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
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
                  <TouchableOpacity style={[styles.pickerItem, isSelected && styles.pickerItemSelected]} onPress={() => { onValueChange(item.value); setModalVisible(false); }}>
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>{item.label}</Text>
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

const styles = StyleSheet.create({
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
});