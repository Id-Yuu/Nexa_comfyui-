import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Alert, FlatList, Image, TextInput, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalStyles as styles } from '../../styles/globalStyles';

export const MenuModal = ({ isMenuOpen, setIsMenuOpen, menuTab, setMenuTab, openAddModal, savedWorkflows, activeWorkflow, handleSelectWorkflow, deleteWorkflow, openEditModal, history, setHistory, setSelectedHistory, serverIP, setServerIP, showToast, setIsTutorialVisible, setTutorialStep, setIsDonationVisible }) => {
  const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  return (
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
                    <Text style={styles.wfCardTitle}>{wf.name}</Text><Text style={styles.wfCardSub}>{wf.customInputs.length} Overrides</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ padding: 10 }} onPress={() => openEditModal(wf)}><Ionicons name="pencil" size={20} color="#888" /></TouchableOpacity>
                  <Ionicons name="checkmark-circle" size={24} color={activeWorkflow?.id === wf.id ? "#0A84FF" : "transparent"} />
                </View>
              ))}
            </ScrollView>
          </View>
        ) : menuTab === 'history' ? (
          <View style={{ flex: 1, marginTop: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}><Text style={styles.label}>Recent Generations</Text>{history.length > 0 && (<TouchableOpacity onPress={() => Alert.alert("Clear History", "Are you sure you want to delete all history?", [{ text: "Cancel" }, { text: "Clear", style: "destructive", onPress: async () => { animate(); setHistory([]); await AsyncStorage.removeItem('glassHistory'); } }])}><Text style={{ color: '#FF3B30', fontSize: 13, fontWeight: 'bold' }}>Clear All</Text></TouchableOpacity>)}</View>
            {history.length === 0 ? <Text style={styles.emptyText}>No history yet.</Text> : (
              <FlatList data={history} keyExtractor={item => item.id} showsVerticalScrollIndicator={false} numColumns={2} columnWrapperStyle={{ justifyContent: 'space-between' }} renderItem={({ item }) => (
                <TouchableOpacity style={{ width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', marginBottom: 15 }} onPress={() => setSelectedHistory(item)}><Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} /></TouchableOpacity>
              )} />
            )}
          </View>
        ) : (
          <View style={{ flex: 1, marginTop: 20 }}>
            <View style={styles.card}>
              <Text style={styles.label}>ComfyUI Server IP</Text>
              <TextInput style={styles.glassInput} value={serverIP} onChangeText={setServerIP} placeholderTextColor="#888" placeholder="192.168.1.100:8188" />
              <TouchableOpacity style={[styles.primaryBtn, { marginTop: 15 }]} onPress={() => { AsyncStorage.setItem('comfyIP', serverIP); showToast("Saved"); }}><Text style={styles.primaryBtnText}>Save Settings</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333', marginTop: 10 }]} onPress={() => { animate(); setIsTutorialVisible(true); setTutorialStep(0); }}><Text style={[styles.primaryBtnText, { color: '#0A84FF' }]}>📖 How to use the app</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#1C1C1E', borderWidth: 1, borderColor: '#333', marginTop: 10 }]} onPress={() => setIsDonationVisible(true)}><Text style={[styles.primaryBtnText, { color: '#32CD32' }]}>💸 Donate</Text></TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};