// src/screens/ResetPasswordScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Linking as RNLinking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import api from "../../services/api";

const GRADIENT_START = "#1c6c7c";
const GRADIENT_END   = "#248bbc";

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route      = useRoute();

  // ────────── State ──────────
  const [email,    setEmail]    = useState(route.params?.email || "");
  const [otp,      setOtp]      = useState("");          // 6-digit code
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);

  // ────────── Deep-link (for email only) ──────────
  useEffect(() => {
    function handleUrl({ url }) {
      const { queryParams } = RNLinking.parse(url);
      if (queryParams?.email) setEmail(queryParams.email);
    }
    RNLinking.addEventListener("url", handleUrl);
    return () => RNLinking.removeEventListener("url", handleUrl);
  }, []);

  // ────────── Submit ──────────
  async function handleSubmit() {
    if (!email || !otp || !password || !confirm) {
      return Alert.alert("Required", "All fields are required.");
    }
    if (otp.length !== 6) {
      return Alert.alert("Invalid OTP", "Code must be 6 digits.");
    }
    if (password !== confirm) {
      return Alert.alert("Mismatch", "Passwords do not match.");
    }

    setLoading(true);
    try {
      await api.post("/password/reset", {
        email,
        otp,
        password,
        password_confirmation: confirm,
      });
      Alert.alert("Success", "Password reset successful!");
      navigation.navigate("Login");
    } catch (e) {
      console.log("Reset-password error:", e.response || e);
      const msg =
        e?.response?.data?.message || "Could not reset password. Try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }

  // ────────── UI ──────────
  return (
    <LinearGradient colors={[GRADIENT_START, GRADIENT_END]} style={styles.fill}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <Ionicons name="lock-closed" size={64} color="#fff" />
          <Text style={styles.title}>Reset Password</Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#ddd"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            placeholder="6-Digit Code"
            placeholderTextColor="#ddd"
            style={styles.input}
            value={otp}
            onChangeText={setOtp}
            keyboardType="numeric"
            maxLength={6}
          />

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
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill:        { flex: 1 },
  container:   { flex: 1, justifyContent: "center", padding: 30 },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "600",
    marginVertical: 20,
  },
  input: {
    backgroundColor: "#fff",
    color: "#333",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    backgroundColor: "#4c6c7c",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
