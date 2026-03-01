import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCleanIP, getRandomSeed } from '../utils/helpers';

export const useComfyWS = (serverIP) => {
  const [clientId] = useState(Math.random().toString(36).substring(2, 15));
  const wsRef = useRef(null);

  const [checkpoints, setCheckpoints] = useState([]);
  const [ggufs, setGgufs] = useState([]);
  const [loras, setLoras] = useState([]);
  const [samplers, setSamplers] = useState(["euler", "euler_ancestral", "dpmpp_2m"]);
  const [schedulers, setSchedulers] = useState(["normal", "karras", "simple"]);

  const [imageUrl, setImageUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!serverIP) return;
    const cleanIP = getCleanIP(serverIP);

    const fetchModels = async () => {
      try {
        const response = await fetch(`http://${cleanIP}/object_info`);
        const data = await response.json();
        setCheckpoints(data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || checkpoints);
        setGgufs(data?.UnetLoaderGGUF?.input?.required?.unet_name?.[0] || ggufs);
        setLoras(data?.LoraLoaderModelOnly?.input?.required?.lora_name?.[0] || loras);
        setSamplers(data?.KSampler?.input?.required?.sampler_name?.[0] || samplers);
        setSchedulers(data?.KSampler?.input?.required?.scheduler?.[0] || schedulers);
      } catch (error) { console.log("Failed to fetch models"); }
    };
    
    fetchModels();

    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(`ws://${cleanIP}/ws?clientId=${clientId}`);
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'progress') setProgress(Math.round((msg.data.value / msg.data.max) * 100));
        if (msg.type === 'execution_success') setProgress(100);
        if (msg.type === 'execution_error' || msg.type === 'execution_interrupted') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setIsGenerating(false);
          Alert.alert('Generation Error', msg.data?.exception_message || 'ComfyUI encountered an error.');
        }
      } catch (e) { }
    };
    
    wsRef.current = ws;
    return () => ws.close();
  }, [serverIP, clientId]);

  const generateImage = async ({ activeWorkflow, autoValues, setAutoValues, customValues, setCustomValues, autoSeedsActive, customAutoSeeds, visibleLoraIndices, setHistory, setShowOptions }) => {
    if (!activeWorkflow) return Alert.alert("Error", "Select a workflow first.");
    const cleanIP = getCleanIP(serverIP);
    setIsGenerating(true); setProgress(0); setImageUrl(null); setShowOptions(false);

    try {
      let str = activeWorkflow.jsonString;
      let currentCustomVals = { ...customValues };

      if (activeWorkflow.customInputs) {
        activeWorkflow.customInputs.forEach(inp => {
          if (inp.type === 'seed' && customAutoSeeds[inp.id]) currentCustomVals[inp.id] = getRandomSeed();
          let val = currentCustomVals[inp.id] != null ? currentCustomVals[inp.id] : "";
          if (inp.type === 'lora' && val === "") val = "None";
          
          let trigger = inp.trigger;
          if ((trigger.startsWith('"') && trigger.endsWith('"')) || (trigger.startsWith("'") && trigger.endsWith("'"))) trigger = trigger.slice(1, -1);
          
          if (['text', 'string', 'lora', 'model', 'gguf', 'sampler', 'scheduler'].includes(inp.type)) {
            str = str.split(`"${trigger}"`).join(JSON.stringify(val));
          } else {
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
              } catch (err) { }
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
        if (map.loadImages) { map.loadImages.forEach(id => { if (currentAutoVals[`${id}|image`]) inject(id, 'image', currentAutoVals[`${id}|image`]); }); }

        map.loraSlots.forEach((slot, index) => {
          const isVisible = visibleLoraIndices.includes(index); 
          const rawVal = currentAutoVals[`${slot.nodeId}|${slot.loraKey}`]; 
          const finalLoraVal = (isVisible && rawVal && rawVal !== "") ? rawVal : "None";
          inject(slot.nodeId, slot.loraKey, finalLoraVal); 
          if (isVisible && slot.weightKey) inject(slot.nodeId, slot.weightKey, Number(currentAutoVals[`${slot.nodeId}|${slot.weightKey}`] || 1.0));
        });
      }

      const response = await fetch(`http://${cleanIP}/prompt`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: finalWorkflowObj, client_id: clientId }) });
      const data = await response.json();

      if (data.error || data.node_errors && Object.keys(data.node_errors).length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsGenerating(false); setShowOptions(true);
        const errMsg = data.error?.message || 'ComfyUI rejected the prompt.';
        const nodeErrs = data.node_errors ? Object.values(data.node_errors).map(n => n.errors?.map(e => e.message).join(', ')).filter(Boolean).join('\n') : '';
        return Alert.alert('Prompt Error', nodeErrs || errMsg);
      }

      const promptId = data.prompt_id;
      let pollCount = 0;
      const interval = setInterval(async () => {
        pollCount++;
        if (pollCount > 180) { clearInterval(interval); setIsGenerating(false); setShowOptions(true); return Alert.alert('Timeout', 'Generation timed out after 6 minutes.'); }
        try {
          const historyRes = await fetch(`http://${cleanIP}/history/${promptId}`); 
          const historyData = await historyRes.json();
          if (historyData[promptId]) {
            clearInterval(interval);
            const status = historyData[promptId].status;
            if (status && status.status_str === 'error') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setIsGenerating(false); setShowOptions(true);
              return Alert.alert('Generation Error', status.messages?.map(m => m[1]?.message).filter(Boolean).join('\n') || 'An error occurred.');
            }
            const outputs = historyData[promptId].outputs;
            let filename = "", folderType = "", subfolder = "";
            for (let nodeId in outputs) {
              if (outputs[nodeId].images && outputs[nodeId].images.length > 0) { 
                filename = outputs[nodeId].images[0].filename; folderType = outputs[nodeId].images[0].type; subfolder = outputs[nodeId].images[0].subfolder; break; 
              }
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
          clearInterval(interval); setIsGenerating(false); setShowOptions(true); Alert.alert('Error', 'Lost connection while waiting for result.');
        }
      }, 2000);

    } catch (error) { setIsGenerating(false); setShowOptions(true); Alert.alert("Network Error", "Could not connect to ComfyUI server."); }
  };

  return { checkpoints, ggufs, loras, samplers, schedulers, imageUrl, setImageUrl, isGenerating, progress, generateImage };
};