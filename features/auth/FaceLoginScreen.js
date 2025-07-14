import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Camera } from "expo-camera";

export default function FaceLoginScreen({ navigation }) {
  const [hasPermission, setHasPermission] = useState(null);
  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true, // or false if you just want the URI
      });
      
      // Now you have the user's face photo:
      // 1) Send to your server or a face-recognition API
      // 2) Compare with a stored face or run a ML model
      // 3) If match => log user in, else => alert
      fakeFaceRecognitionCheck(photo.base64);
    }
  };

  const fakeFaceRecognitionCheck = (base64) => {
    // Simulate "face recognized" or not recognized
    // Replace this with real logic or an API call
    const recognized = Math.random() > 0.5; // 50% chance success
    if (recognized) {
      Alert.alert("Face Recognition", "Face recognized! Logging in...");
      // TODO: Navigate to your home screen or dispatch login
      navigation.goBack(); // or navigation.replace("SomeScreen")
    } else {
      Alert.alert("Face Recognition", "Face NOT recognized. Please try again.");
    }
  };

  if (hasPermission === null) {
    return <Text>Requesting camera permission...</Text>;
  }
  if (hasPermission === false) {
    return <Text>No access to camera. Please enable it in settings.</Text>;
  }

  return (
    <View style={styles.container}>
      <Camera style={styles.camera} ref={cameraRef} />
      <TouchableOpacity style={styles.captureButton} onPress={handleTakePicture}>
        <Text style={styles.captureText}>Capture Face</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  captureButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 10,
  },
  captureText: { color: "#fff", fontWeight: "bold" },
});
