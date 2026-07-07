import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { loginUser, registerUser } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Validation and UI states
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const [activeField, setActiveField] = useState<string | null>(null);

  const router = useRouter();

  // Custom Form Validation
  const validateForm = () => {
    const tempErrors: { [key: string]: string } = {};
    setApiError(null);

    // Email validation (regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      tempErrors.email = 'Email address is required.';
    } else if (!emailRegex.test(email)) {
      tempErrors.email = 'Please enter a valid email address.';
    }

    // Password validation
    if (!password) {
      tempErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters.';
    }

    // Additional checks for Registration
    if (!isLogin) {
      if (!name.trim()) {
        tempErrors.name = 'Full name is required.';
      }
      if (!phone.trim()) {
        tempErrors.phone = 'Phone number is required.';
      }
      if (password !== confirmPassword) {
        tempErrors.confirmPassword = 'Passwords do not match.';
      }
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isLogin) {
        // Authenticate via Laravel API using Axios
        const result = await loginUser(email.trim(), password);
        console.log('[Auth] Login successful. Redirecting...');
        
        // Navigate based on user role
        if (result?.user?.role === 'staff') {
          router.replace('/(staff1)/inventory');
        } else {
          router.replace('/(tabs)/home');
        }
      } else {
        // Register new responder via Laravel API
        const data = await registerUser(name.trim(), email.trim(), password, phone.trim());
        console.log('[Auth] Registration successful:', data);

        // Notify user about pending approval
        Alert.alert(
          'Registration Successful',
          'Your registration request has been submitted and is currently pending approval by the administrator.\n\nYou will be able to log in once your account is approved.',
          [{ text: 'OK', onPress: () => setIsLogin(true) }]
        );

        // Clear registration fields
        setName('');
        setPhone('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error: any) {
      setApiError(error.message || 'An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      enabled={Platform.OS === 'ios'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      
      {/* Premium glowing background overlay */}
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          
          {/* Custom MDRRMO Logo */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/images/mdrrmo_logo.jpg')} 
              style={{ width: 120, height: 120, resizeMode: 'contain' }} 
            />
          </View>

          <Text style={styles.title}>MDRRMO Management System</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'SECURE RESPONDER GATEWAY' : 'CREATE RESPONDER ACCOUNT'}
          </Text>

          {apiError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={20} color="#fc8181" style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{apiError}</Text>
            </View>
          )}

          {/* Name Field (Register Only) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Full Name</Text>
              <View style={[
                styles.inputWrapper, 
                errors.name ? styles.inputWrapperError : null,
                activeField === 'name' ? styles.inputWrapperActive : null
              ]}>
                <Ionicons name="person-outline" size={18} color={activeField === 'name' ? '#0a84ff' : '#666'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your name"
                  placeholderTextColor="#666"
                  value={name}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onChangeText={(text) => {
                    setName(text);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                  }}
                />
              </View>
              {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
            </View>
          )}

          {/* Phone Field (Register Only) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={[
                styles.inputWrapper, 
                errors.phone ? styles.inputWrapperError : null,
                activeField === 'phone' ? styles.inputWrapperActive : null
              ]}>
                <Ionicons name="call-outline" size={18} color={activeField === 'phone' ? '#0a84ff' : '#666'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="+639xxxxxxxx"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                  value={phone}
                  onFocus={() => setActiveField('phone')}
                  onBlur={() => setActiveField(null)}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                />
              </View>
              {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
            </View>
          )}

          {/* Email Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[
              styles.inputWrapper, 
              errors.email ? styles.inputWrapperError : null,
              activeField === 'email' ? styles.inputWrapperActive : null
            ]}>
              <Ionicons name="mail-outline" size={18} color={activeField === 'email' ? '#0a84ff' : '#666'} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="responder@domain.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onFocus={() => {}}
                onBlur={() => {}}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                }}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password Field */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={[
              styles.inputWrapper, 
              errors.password ? styles.inputWrapperError : null,
              activeField === 'password' ? styles.inputWrapperActive : null
            ]}>
              <Ionicons name="lock-closed-outline" size={18} color={activeField === 'password' ? '#0a84ff' : '#666'} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter password"
                placeholderTextColor="#666"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onFocus={() => {}}
                onBlur={() => {}}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
                }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.showButton}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#0a84ff" />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* Confirm Password (Register Only) */}
          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[
                styles.inputWrapper, 
                errors.confirmPassword ? styles.inputWrapperError : null,
                activeField === 'confirmPassword' ? styles.inputWrapperActive : null
              ]}>
                <Ionicons name="lock-closed-outline" size={18} color={activeField === 'confirmPassword' ? '#0a84ff' : '#666'} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Confirm password"
                  placeholderTextColor="#666"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={confirmPassword}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                  }}
                />
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.button, isLoading ? styles.buttonDisabled : null]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Text style={styles.buttonText}>{isLogin ? 'AUTHENTICATE' : 'CREATE ACCOUNT'}</Text>
                <Ionicons name={isLogin ? "chevron-forward-outline" : "person-add-outline"} size={18} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* Toggle Login/Register Mode */}
          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() => {
              setIsLogin(!isLogin);
              setErrors({});
              setApiError(null);
            }}
          >
            <Text style={styles.toggleText}>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Text style={styles.toggleTextHighlight}>
                {isLogin ? 'Sign Up' : 'Sign In'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050507',
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    filter: 'blur(80px)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -150,
    left: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    filter: 'blur(100px)',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#111115',
    borderRadius: 28,
    padding: 28,
    borderWidth: 1,
    borderColor: '#1f1f26',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 12,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoGlowRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(10, 132, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(10, 132, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0a84ff',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 1.5,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },
  errorBannerText: {
    color: '#fc8181',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8e8e93',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181822',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2b2b36',
    paddingHorizontal: 16,
    height: 54,
  },
  inputWrapperActive: {
    borderColor: '#0a84ff',
    shadowColor: '#0a84ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  inputWrapperError: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    height: '100%',
  },
  passwordInput: {
    paddingRight: 40,
  },
  showButton: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  errorText: {
    color: '#fc8181',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#0a84ff',
    borderRadius: 14,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#0a84ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#004280',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  toggleContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleText: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '500',
  },
  toggleTextHighlight: {
    color: '#0a84ff',
    fontWeight: '700',
  },
});

