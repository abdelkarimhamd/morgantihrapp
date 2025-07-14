// src/screens/OTPScreen.js
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../../../services/api";

const GRADIENT_START = "#1c6c7c";
const GRADIENT_END   = "#248bbc";

export default function OTPScreen() {
  const navigation      = useNavigation();
  const route           = useRoute();
  const [identifier]         = useState(route.params?.email || "");
  console.log("Email from params:", identifier);
  
  const [otp, setOtp]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify() {
    if (otp.length !== 6) {
      return Alert.alert("Code needed", "Enter the 6-digit code.");
    }
    setLoading(true);
    try {
      // NEW endpoint that just validates the OTP
      await api.post("/password/verify-otp", { identifier, otp });

      navigation.navigate("ChangePassword", { identifier, otp });
    } catch (e) {
      console.log("OTP verification error:", e);
      
      const msg = e?.response?.data?.message || "Code invalid or expired.";
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
          <Ionicons name="shield-checkmark" size={64} color="#fff" />
          <Text style={styles.title}>Enter 6-Digit Code</Text>

          <TextInput
            placeholder="123 456"
            placeholderTextColor="#ddd"
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            keyboardType="numeric"
            maxLength={6}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> :
              <Text style={styles.buttonText}>Verify</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill:{flex:1}, container:{flex:1,justifyContent:"center",padding:30},
  title:{color:"#fff",fontSize:28,fontWeight:"600",marginVertical:20},
  input:{backgroundColor:"#fff",color:"#333",borderRadius:12,padding:16,fontSize:20,letterSpacing:2,textAlign:"center"},
  button:{marginTop:20,backgroundColor:"#4c6c7c",padding:16,borderRadius:12,alignItems:"center"},
  buttonText:{color:"#fff",fontWeight:"600",fontSize:16},
});
