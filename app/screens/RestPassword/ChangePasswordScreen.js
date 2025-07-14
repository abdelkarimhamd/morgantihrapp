// src/screens/ChangePasswordScreen.js
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../../../services/api";

const GRADIENT_START="#1c6c7c"; const GRADIENT_END="#248bbc";

export default function ChangePasswordScreen() {
  const navigation      = useNavigation();
  const route           = useRoute();
  const { identifier, otp }  = route.params || {};

  const [password, setPassword] = useState("");
  const [confirm,  setConfirm ] = useState("");
  const [loading,  setLoading ] = useState(false);

  async function handleSave() {
    if (!password || !confirm) {
      return Alert.alert("Required", "Enter new password twice.");
    }
    if (password !== confirm) {
      return Alert.alert("Mismatch", "Passwords do not match.");
    }
    setLoading(true);
    try {
      await api.post("/password/reset", {
        identifier,
        otp,
        password,
        password_confirmation: confirm,
      });
      Alert.alert("Success", "Password changed! Please log in.");
      navigation.navigate("Login");
    } catch (e) {
      const msg = e?.response?.data?.message || "Could not change password.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[GRADIENT_START, GRADIENT_END]} style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <Ionicons name="lock-closed" size={64} color="#fff" />
          <Text style={styles.title}>Set New Password</Text>

          <TextInput
            placeholder="New Password"
            placeholderTextColor="#ddd"
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TextInput
            placeholder="Confirm Password"
            placeholderTextColor="#ddd"
            style={styles.input}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> :
              <Text style={styles.buttonText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles=StyleSheet.create({
  fill:{flex:1}, container:{flex:1,justifyContent:"center",padding:30},
  title:{color:"#fff",fontSize:28,fontWeight:"600",marginVertical:20},
  input:{backgroundColor:"#fff",color:"#333",borderRadius:12,padding:16,fontSize:16,marginBottom:15},
  button:{marginTop:10,backgroundColor:"#4c6c7c",padding:16,borderRadius:12,alignItems:"center"},
  buttonText:{color:"#fff",fontWeight:"600",fontSize:16},
});
