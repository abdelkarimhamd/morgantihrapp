// src/screens/ForgotPasswordScreen.js
import React, { useState } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import api from "../../../services/api";

const GRADIENT_START = "#1c6c7c";
const GRADIENT_END   = "#248bbc";

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState("");  // email OR employee_code
  const [loading, setLoading]       = useState(false);
  const navigation                  = useNavigation();

  async function handleSubmit() {
    if (!identifier.trim()) {
      return Alert.alert("Required", "Enter your e-mail or Employee Code");
    }
    setLoading(true);
    try {
      await api.post("/password/forgot", { identifier });

      Alert.alert(
        "Check your inbox",
        "If the account exists, you’ll soon receive a 6-digit code."
      );

      // → OTPScreen so user can enter the code
      navigation.navigate("OTPScreen", { email: identifier.trim() });
    } catch (e) {
      console.log("Forgot-password error:", e);
      Alert.alert("Error", "Something went wrong, please try again.");
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
          <Ionicons name="mail" size={64} color="#fff" style={{ margin: 10 }} />
          <Text style={styles.title}>Forgot Password</Text>

          <TextInput
            placeholder="E-mail or Employee Code"
            placeholderTextColor="#ddd"
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  container: { flex: 1, justifyContent: "center", padding: 30 },
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
  },
  button: {
    marginTop: 20,
    backgroundColor: "#4c6c7c",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  backText: { color: "#fff", marginTop: 25, textAlign: "center" },
});
