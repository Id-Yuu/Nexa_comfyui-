import React from 'react';
import { Modal, View, Text, TouchableOpacity, Linking } from 'react-native';
import { globalStyles as styles } from '../../styles/globalStyles';

export const DonationModal = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} animationType="fade" transparent={true}>
      <View style={styles.overlay}>
        <View style={[styles.popup, { width: '90%', paddingVertical: 35 }]}>
          <Text style={[styles.title, { marginBottom: 15, fontSize: 24, textAlign: 'center', color: '#fff' }]}>Support the Creator</Text>
          <Text style={[styles.tutorialText, { textAlign: 'center' }]}>This app is open source and free forever. If you want to help me keep updating it, please consider donating at:</Text>
          <TouchableOpacity style={[styles.card, { backgroundColor: '#1A1A1A', padding: 15, marginBottom: 15, alignItems: 'center' }]} onPress={() => Linking.openURL('https://ko-fi.com/kasumaoniisan')}>
            <Text style={{ color: '#0A84FF', fontSize: 18, fontWeight: 'bold' }}>Ko-fi (Buy me a coffee)</Text>
            <Text style={{ color: '#888', fontSize: 14, marginTop: 4 }}>ko-fi.com/kasumaoniisan</Text>
          </TouchableOpacity>
          <View style={[styles.card, { backgroundColor: '#1A1A1A', padding: 15, marginBottom: 25 }]}>
            <Text style={{ color: '#aaa', fontSize: 14, marginBottom: 5, textAlign: 'center' }}>Crypto (LTC):</Text>
            <Text selectable={true} style={{ color: '#32CD32', fontSize: 13, fontFamily: 'monospace', textAlign: 'center', backgroundColor: '#000', padding: 10, borderRadius: 8 }}>LSjf1DczHxs3GEbkoMmi1UWH2GikmXDtis</Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={onClose}><Text style={styles.primaryBtnText}>Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};