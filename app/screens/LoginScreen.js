// LoginScreen.js
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  Platform,
  useWindowDimensions,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { Camera } from "expo-camera";
import * as Notifications from "expo-notifications";
import * as LocalAuthentication from "expo-local-authentication";

import { RainingSquares } from "../components/RainingSquares";
import { loginUser } from "../../features/auth/authSlice";
import {
  saveCredentials,
  getCredentials,
} from "../../features/auth/secureStoreService";
import MorgantiLogo from "../../assets/morganti-logo.png";
import api from "../../services/api";

// ────────── Constants ──────────
const GRADIENT_START = "#1c6c7c";
const GRADIENT_END = "#248bbc";
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ────────── Push Notifications ──────────
async function registerForPushNotificationsAsync() {
  let token;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert(
      "Notification Permission",
      "No notification permissions granted."
    );
    return null;
  }

  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
  } catch (e) {
    console.error("Failed to get push token", e);
  }
  return token;
}

export default function LoginScreen() {
  // ────────── Local state ──────────
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [cameraPermission, setCameraPermission] = useState(null);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const buttonScale = new Animated.Value(1);

  // ────────── Hooks ──────────
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const { status } = useSelector((state) => state.auth);

  // Responsive info
  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 768;
  const isLandscape = width > height;
  const isIOS = Platform.OS === "ios";
  const dynamicStyles = getDynamicStyles(isLargeScreen, isLandscape, isIOS);

  // ────────── Effects ──────────
  useEffect(() => {
    checkBiometricSupport();
    requestCameraPermissionIfNeeded();
  }, []);

  async function requestCameraPermissionIfNeeded() {
    if (Platform.OS === "android") {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraPermission(status === "granted");
    } else {
      setCameraPermission(true);
    }
  }

  async function checkBiometricSupport() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricSupported(hasHardware && enrolled);
    } catch (err) {
      console.log("Biometric support check error:", err);
      setBiometricSupported(false);
    }
  }

  // ────────── Helpers ──────────
  const animatePress = (toValue) => {
    Animated.spring(buttonScale, {
      toValue,
      useNativeDriver: true,
    }).start();
  };
  const handlePressIn = () => animatePress(0.95);
  const handlePressOut = () => animatePress(1);

  const validateForm = () => {
    const newErrors = {};
    if (!employeeCode.trim()) newErrors.employeeCode = "Employee Code is required.";
    if (!password) newErrors.password = "Password is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ────────── Login (regular) ──────────
  const handleSubmit = async () => {
    if (!validateForm()) return;

    dispatch(loginUser({ employee_code: employeeCode, password }))
      .unwrap()
      .then(async (res) => {
        Alert.alert("Success", "Login successful!");

        if (rememberMe) {
          await saveCredentials("employee_code", employeeCode);
          await saveCredentials("password", password);
        }

        const expoToken = await registerForPushNotificationsAsync();
        if (expoToken && res.user?.employee_code) {
          api
            .post("/save-expo-token", {
              user_id: res.user.employee_code,
              expo_token: expoToken,
            })
            .catch((err) => console.error("Failed to save expo token:", err));
        }

        navigateBasedOnRole(res.user?.role);
      })
      .catch((err) => {
        console.log("Login error:", err);

        const statusCode = err?.status;
        let message = "Something went wrong, please try again.";
        let fieldErrors = {};

        if (statusCode === 401) {
          message = "Incorrect employee code or password.";
          fieldErrors = { employeeCode: " ", password: " " };
        } else if (statusCode === 403) {
          message = "Your account is inactive. Please contact your admin or HR.";
        } else if (err?.message) {
          message = err.message;
        }

        setErrors({ ...fieldErrors, api: message });
      });



  };

  // ────────── Login (biometrics) ──────────
  const handleBiometricLogin = async () => {
    if (!biometricSupported)
      return Alert.alert(
        "Biometrics Not Available",
        "No Face/Touch ID is available on this device."
      );

    if (Platform.OS === "android" && !cameraPermission) {
      Alert.alert(
        "Camera Permission Required",
        "Please grant camera access for facial recognition."
      );
      return;
    }

    try {
      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to continue",
        fallbackLabel: "Use Passcode",
      });

      if (!authResult.success) {
        throw new Error(
          authResult.error || "Biometric authentication failed/canceled"
        );
      }

      const [savedEmployeeCode, savedPassword] = await Promise.all([
        getCredentials("employee_code"),
        getCredentials("password"),
      ]);

      if (!savedEmployeeCode || !savedPassword) {
        Alert.alert(
          "Error",
          "No stored credentials found. Please login manually first."
        );
        return;
      }

      const res = await dispatch(
        loginUser({
          employee_code: savedEmployeeCode,
          password: savedPassword,
        })
      ).unwrap();

      Alert.alert("Success", "Biometric login successful!");
      navigateBasedOnRole(res.user?.role);
    } catch (error) {
      console.error("Biometric login error:", error);
      Alert.alert(
        "Authentication Error",
        error.message || "Could not authenticate. Please try again."
      );
    }
  };

  // ────────── Navigation ──────────
  function navigateBasedOnRole(userRole) {
    if (userRole === "hr_admin") {
      navigation.navigate("Drawer", { screen: "AdminDashboard" });
    } else if (userRole === "manager" || userRole === "finance") {
      navigation.navigate("Drawer", { screen: "ManagerDashboard" });
    } else {
      navigation.navigate("Drawer", { screen: "EmployeeDashboard" });
    }
  }

  // ────────── Render ──────────
  return (
    <LinearGradient
      colors={[GRADIENT_START, GRADIENT_END]}
      style={dynamicStyles.gradientContainer}
    >
      <RainingSquares squareCount={16} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View style={dynamicStyles.container}>
            <Image source={MorgantiLogo} style={dynamicStyles.logo} />
            <Text style={dynamicStyles.welcomeText}>Welcome Back!</Text>

            <View style={dynamicStyles.formContainer}>
              {errors.api && (
                <View style={dynamicStyles.errorContainer}>
                  <Ionicons
                    name="warning"
                    size={dynamicStyles.iconSize - 4}
                    color="#fff"
                  />
                  <Text style={dynamicStyles.errorText}>{errors.api}</Text>
                </View>
              )}

              {/* Employee Code */}
              <View>
                <View
                  style={[
                    dynamicStyles.inputContainer,
                    errors.employeeCode && dynamicStyles.inputError,
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={dynamicStyles.iconSize - 6}
                    color="#4c6c7c"
                    style={dynamicStyles.inputIcon}
                  />
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder="Employee Code"
                    placeholderTextColor="#8a8a8a"
                    autoCapitalize="none"
                    onChangeText={(text) => {
                      setEmployeeCode(text);
                      if (errors.employeeCode)
                        setErrors((prev) => ({ ...prev, employeeCode: null }));
                      if (errors.api)
                        setErrors((prev) => ({ ...prev, api: null }));
                    }}
                    value={employeeCode}
                    onBlur={validateForm}
                  />
                </View>
                {errors.employeeCode && (
                  <Text style={dynamicStyles.fieldErrorText}>
                    {errors.employeeCode}
                  </Text>
                )}
              </View>

              {/* Password */}
              <View>
                <View
                  style={[
                    dynamicStyles.inputContainer,
                    errors.password && dynamicStyles.inputError,
                  ]}
                >
                  <Ionicons
                    name="lock-closed"
                    size={dynamicStyles.iconSize - 6}
                    color="#4c6c7c"
                    style={dynamicStyles.inputIcon}
                  />
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder="Password"
                    placeholderTextColor="#8a8a8a"
                    secureTextEntry={!showPassword}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password)
                        setErrors((prev) => ({ ...prev, password: null }));
                      if (errors.api)
                        setErrors((prev) => ({ ...prev, api: null }));
                    }}
                    value={password}
                    onBlur={validateForm}
                  />
                  <TouchableOpacity
                    style={dynamicStyles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={dynamicStyles.iconSize - 6}
                      color="#4c6c7c"
                    />
                  </TouchableOpacity>
                </View>
                {errors.password && (
                  <Text style={dynamicStyles.fieldErrorText}>
                    {errors.password}
                  </Text>
                )}
              </View>

              {/* Remember / Forgot */}
              <View style={dynamicStyles.optionsContainer}>
                <TouchableOpacity
                  style={dynamicStyles.rememberMe}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <Ionicons
                    name={rememberMe ? "checkbox" : "square-outline"}
                    size={dynamicStyles.iconSize - 8}
                    color="#fff"
                  />
                  <Text style={dynamicStyles.optionText}>Remember Me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate("ForgotPassword")}                >
                  <Text style={dynamicStyles.optionText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In */}
              <AnimatedTouchable
                style={[
                  dynamicStyles.button,
                  { transform: [{ scale: buttonScale }] },
                ]}
                onPress={handleSubmit}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="log-in"
                      size={dynamicStyles.iconSize - 8}
                      color="#fff"
                    />
                    <Text style={dynamicStyles.buttonText}>Sign In</Text>
                  </>
                )}
              </AnimatedTouchable>

              {/* Biometrics */}
              {biometricSupported && (
                <TouchableOpacity
                  style={dynamicStyles.biometricButton}
                  onPress={handleBiometricLogin}
                >
                  <Ionicons
                    name="finger-print"
                    size={dynamicStyles.iconSize}
                    color="#fff"
                  />
                  <Text style={dynamicStyles.biometricText}>
                    Use Biometrics
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// ────────── Dynamic Styles ──────────
function getDynamicStyles(isLargeScreen, isLandscape, isIOS) {
  const baseFontSize = isLargeScreen ? 18 : 16;
  const iconSize = isLargeScreen ? 28 : 22;

  return StyleSheet.create({
    gradientContainer: {
      flex: 1,
    },
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: isLargeScreen || isLandscape ? 40 : 30,
      paddingVertical: 20,
      zIndex: 999,
    },
    logo: {
      width: isLargeScreen ? 220 : 180,
      height: isLargeScreen ? 90 : 70,
      resizeMode: "contain",
      marginBottom: isLargeScreen ? 25 : 15,
    },
    welcomeText: {
      fontSize: isLargeScreen ? 28 : 24,
      fontWeight: "600",
      color: "#fff",
      marginBottom: isLargeScreen ? 30 : 25,
    },
    formContainer: {
      width: "100%",
      backgroundColor: "rgba(255,255,255,0.15)",
      borderRadius: 20,
      padding: isLargeScreen ? 30 : 25,
    },
    errorContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#b30000",
      padding: 12,
      borderRadius: 10,
      marginBottom: 15,
    },
    errorText: {
      color: "#fff",
      marginLeft: 10,
      fontWeight: "500",
      fontSize: baseFontSize - 3,
      flexShrink: 1,
    },
    fieldErrorText: {
      color: "#ffcdd2",
      fontSize: 13,
      marginTop: -10,
      marginBottom: 10,
      marginLeft: 5,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#fff",
      borderRadius: 12,
      marginBottom: 15,
      borderWidth: 2,
      borderColor: "transparent",
    },
    inputError: {
      borderColor: "#e53935",
    },
    inputIcon: {
      marginLeft: 15,
    },
    input: {
      flex: 1,
      paddingVertical: isLargeScreen ? 16 : 14,
      paddingHorizontal: 15,
      fontSize: baseFontSize,
      color: "#333",
    },
    passwordToggle: {
      padding: 15,
    },
    optionsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginVertical: 10,
    },
    rememberMe: {
      flexDirection: "row",
      alignItems: "center",
    },
    optionText: {
      color: "#fff",
      marginLeft: 8,
      fontSize: baseFontSize - 2,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#4c6c7c",
      padding: isLargeScreen ? 18 : 16,
      borderRadius: 12,
      marginTop: 20,
      gap: 10,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    buttonText: {
      color: "#fff",
      fontWeight: "600",
      fontSize: baseFontSize,
    },
    biometricButton: {
      alignItems: "center",
      marginTop: 25,
      padding: 10,
    },
    biometricText: {
      color: "#fff",
      marginTop: 8,
      fontWeight: "500",
      fontSize: baseFontSize - 2,
    },
    iconSize,
  });
}
