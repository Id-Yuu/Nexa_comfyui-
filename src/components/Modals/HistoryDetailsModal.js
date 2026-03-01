import React from 'react';
import { Modal, View, Text, Image, TouchableOpacity, ScrollView, Alert, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalStyles as styles } from '../../styles/globalStyles';

export const HistoryDetailsModal = ({ selectedHistory, setSelectedHistory, history, setHistory }) => {
  if (!selectedHistory) return null;

  const handleDelete = () => {
    Alert.alert("Delete", "Remove this image from history?", [{ text: "Cancel" }, {
      text: "Delete", style: "destructive", onPress: async () => {
        const updated = history.filter(h => h.id !== selectedHistory.id);
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setHistory(updated);
        await AsyncStorage.setItem('glassHistory', JSON.stringify(updated));
        setSelectedHistory(null);
      }
    }]);
  };

  return (
    <Modal visible={!!selectedHistory} animationType="slide" transparent={true}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <Image source={{ uri: selectedHistory.imageUrl }} style={{ width: '100%', height: '60%' }} resizeMode="contain" />
        <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }} onPress={() => setSelectedHistory(null)}><Ionicons name="close-circle" size={36} color="#fff" /></TouchableOpacity>
        <TouchableOpacity style={{ position: 'absolute', top: 50, right: 70, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 6 }} onPress={handleDelete}><Ionicons name="trash" size={24} color="#FF3B30" /></TouchableOpacity>
        <ScrollView style={{ flex: 1, backgroundColor: '#111', padding: 20 }}>
          <Text style={[styles.title, { marginBottom: 15 }]}>Generation Info</Text>
          <Text style={{ color: '#888', marginBottom: 20 }}>{new Date(selectedHistory.date).toLocaleString()}</Text>
          {Object.keys(selectedHistory.prompt).map(nodeId => {
            const node = selectedHistory.prompt[nodeId];
            if (!node || !node.inputs) return null;
            if (node.class_type === 'CLIPTextEncode') return <View key={nodeId} style={styles.card}><Text style={styles.label}>PROMPT</Text><Text style={{ color: '#fff' }}>{node.inputs.text}</Text></View>;
            if (node.class_type.includes('KSampler')) return (<View key={nodeId} style={styles.card}><Text style={styles.label}>SAMPLER INFO</Text><Text style={{ color: '#ccc' }}>Seed: {node.inputs.seed}</Text><Text style={{ color: '#ccc' }}>Steps: {node.inputs.steps}</Text><Text style={{ color: '#ccc' }}>CFG: {node.inputs.cfg}</Text><Text style={{ color: '#ccc' }}>Sampler: {node.inputs.sampler_name}</Text><Text style={{ color: '#ccc' }}>Scheduler: {node.inputs.scheduler}</Text></View>);
            if (node.class_type === 'CheckpointLoaderSimple') return <View key={nodeId} style={styles.card}><Text style={styles.label}>MODEL</Text><Text style={{ color: '#fff' }}>{node.inputs.ckpt_name}</Text></View>;
            if (node.class_type.includes('LoraLoader')) return <View key={nodeId} style={styles.card}><Text style={styles.label}>LORA</Text><Text style={{ color: '#fff' }}>{node.inputs.lora_name}</Text></View>;
            return null;
          })}
          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};