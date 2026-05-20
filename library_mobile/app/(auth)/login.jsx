// app/(auth)/login.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  ImageBackground,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginApi } from '../../lib/api';

const { width } = Dimensions.get('window');

// ── Design tokens ─────────────────────────────────────────────────────────────
const COLORS = {
  primary:       '#2C1810',
  primaryLight:  '#8B7355',
  secondary:     '#D4A373',
  background:    '#1A0F0A',
  surface:       '#F5F0E1',
  textPrimary:   '#2C1810',
  textSecondary: '#6B4C3A',
  border:        '#E0D5C0',
  borderFocused: '#2C1810',
  inputBg:       '#FFFFFF',
  placeholder:   '#A89880',
  error:         '#B22222',
  errorBg:       '#FDF0F0',
  overlay:       'rgba(0,0,0,0.30)',
};

const FONTS = {
  logo: { medium: 'AllrounderMonumentTest-Medium' },
  body: {
    regular:  'LibreBaskerville-Regular',
    medium:   'LibreBaskerville-Medium',
    semibold: 'LibreBaskerville-SemiBold',
    italic:   'LibreBaskerville-Italic',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function Login() {

  const [fontsLoaded] = useFonts({
    'AllrounderMonumentTest-Medium': require('../../assets/fonts/AllrounderMonumentTest-Medium.ttf'),
    'AllrounderMonumentTest-Book':   require('../../assets/fonts/AllrounderMonumentTest-Book.ttf'),
    'LibreBaskerville-Regular':      require('../../assets/fonts/LibreBaskerville-Regular.ttf'),
    'LibreBaskerville-Medium':       require('../../assets/fonts/LibreBaskerville-Medium.ttf'),
    'LibreBaskerville-SemiBold':     require('../../assets/fonts/LibreBaskerville-SemiBold.ttf'),
    'LibreBaskerville-Italic':       require('../../assets/fonts/LibreBaskerville-Italic.ttf'),
  });

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [remember,     setRemember]     = useState(false);
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [emailErr,     setEmailErr]     = useState('');
  const [passErr,      setPassErr]      = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async () => {
    setEmailErr(''); setPassErr(''); setError('');
    let valid = true;
    if (!email)    { setEmailErr('Email is required.');    valid = false; }
    if (!password) { setPassErr('Password is required.'); valid = false; }
    if (!valid) return;

    try {
      setLoading(true);
      const data = await loginApi(email, password);
      //console.log("Login response:", JSON.stringify(data));
      if (data.token || data.access) {
        await AsyncStorage.setItem('token', data.token || data.access);
        if (data.username)  await AsyncStorage.setItem('username',  data.username);
        if (data.role)      await AsyncStorage.setItem('role',       data.role);
        if (data.member_id) await AsyncStorage.setItem('member_id',  String(data.member_id));

        const role = data.role;
        if (role === 'superadmin')                     router.replace('/superadmin');
        else if (role === 'staff' || role === 'admin') router.replace('/admin');
        else                                           router.replace('/(tabs)/');
      } else {
        setPassErr(data.error || 'Invalid credentials.');
      }
    } catch {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ImageBackground
        source={require('../../assets/login-bg.png')}
        style={s.backgroundImage}
        resizeMode="cover"
      >
        <View style={s.overlay} />
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.contentWrapper}>

            {/* Logo */}
            <View style={s.logoContainer}>
              <Text style={s.logoText}>LIBRIUM</Text>
              <View style={s.logoUnderline} />
            </View>

            {/* Quote */}
            <View style={s.quoteContainer}>
              <Text style={s.quoteText}>
                "Libraries store the energy that fuels the imagination."
              </Text>
              <Text style={s.quoteAuthor}>— Sidney Sheldon</Text>
            </View>

            {/* Card */}
            <View style={s.card}>

              <View style={s.welcomeSection}>
                <Text style={s.welcomeTitle}>WELCOME</Text>
                <View style={s.welcomeDivider} />
              </View>

              {!!error && (
                <View style={s.generalErrorContainer}>
                  <Feather name="alert-circle" size={14} color={COLORS.error} />
                  <Text style={s.generalErrorText}>{error}</Text>
                </View>
              )}

              {/* Email */}
              <View style={s.inputWrapper}>
                <Text style={s.inputLabel}>Email:</Text>
                <View style={[
                  s.inputContainer,
                  !!emailErr               && s.inputError,
                  focusedField === 'email' && s.inputFocused,
                ]}>
                  <Feather name="mail" size={14} color={COLORS.textSecondary} />
                  <TextInput
                    style={s.input}
                    placeholder="name@institution.edu"
                    placeholderTextColor={COLORS.placeholder}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={t => { setEmail(t); setEmailErr(''); }}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    selectionColor={COLORS.primary}
                    underlineColorAndroid="transparent"
                  />
                </View>
                {!!emailErr && <Text style={s.errorText}>{emailErr}</Text>}
              </View>

              {/* Password */}
              <View style={s.inputWrapper}>
                <Text style={s.inputLabel}>Password:</Text>
                <View style={[
                  s.inputContainer,
                  !!passErr                   && s.inputError,
                  focusedField === 'password' && s.inputFocused,
                ]}>
                  <Feather name="lock" size={14} color={COLORS.textSecondary} />
                  <TextInput
                    style={s.input}
                    placeholder="••••••••"
                    placeholderTextColor={COLORS.placeholder}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={t => { setPassword(t); setPassErr(''); }}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    selectionColor={COLORS.primary}
                    underlineColorAndroid="transparent"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(v => !v)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Feather
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={14}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {!!passErr && <Text style={s.errorText}>{passErr}</Text>}
              </View>

              {/* Remember + Forgot */}
              <View style={s.optionsRow}>
                <TouchableOpacity
                  style={s.checkboxContainer}
                  activeOpacity={0.7}
                  onPress={() => setRemember(r => !r)}
                >
                  <View style={[s.checkbox, remember && s.checkboxActive]}>
                    {remember && <Feather name="check" size={9} color="#fff" />}
                  </View>
                  <Text style={s.checkboxLabel}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={s.forgotLink}>Forgot Password</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In */}
              <TouchableOpacity
                style={[s.signInButton, loading && s.signInButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.signInButtonText}>SIGN IN</Text>
                }
              </TouchableOpacity>

              {/* Register */}
              <TouchableOpacity
                style={s.registerRow}
                onPress={() => router.push('/(auth)/register')}
                activeOpacity={0.7}
              >
                <Text style={s.registerLink}>
                  Don't have an account?{' '}
                  <Text style={s.registerLinkBold}>Register</Text>
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  contentWrapper: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },

  // Logo — smaller, tighter
  logoContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontFamily: FONTS.logo.medium,
    fontSize: width < 380 ? 52 : 64,
    fontWeight: 'normal',
    letterSpacing: 3,
    color: COLORS.surface,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  logoUnderline: {
    width: 44,
    height: 2,
    backgroundColor: COLORS.secondary,
    marginTop: 3,
  },

  // Quote — reduced font + spacing
  quoteContainer: {
    alignItems: 'center',
    maxWidth: 340,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  quoteText: {
    fontFamily: FONTS.body.italic,
    fontSize: 12,
    color: COLORS.surface,
    textAlign: 'center',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  quoteAuthor: {
    fontFamily: FONTS.body.medium,
    fontSize: 11,
    color: COLORS.secondary,
    marginTop: 4,
    letterSpacing: 0.4,
  },

  // Card — tighter padding, full width within horizontal padding
  card: {
    backgroundColor: COLORS.surface,
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },

  // Welcome
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontFamily: FONTS.body.semibold,
    fontSize: 20,
    letterSpacing: 3,
    color: COLORS.textPrimary,
  },
  welcomeDivider: {
    width: 60,
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: 8,
  },

  // General error
  generalErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.errorBg,
    padding: 10,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
    gap: 8,
  },
  generalErrorText: {
    flex: 1,
    fontFamily: FONTS.body.regular,
    fontSize: 11,
    color: COLORS.error,
  },

  // Inputs — tighter
  inputWrapper: {
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: FONTS.body.medium,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 5,
    letterSpacing: 0.4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    height: 42,
    gap: 8,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: COLORS.borderFocused,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    fontFamily: FONTS.body.regular,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    paddingHorizontal: 0,
    margin: 0,
  },
  errorText: {
    fontFamily: FONTS.body.regular,
    fontSize: 10,
    color: COLORS.error,
    marginTop: 3,
    marginLeft: 2,
  },

  // Options row
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontFamily: FONTS.body.regular,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  forgotLink: {
    fontFamily: FONTS.body.medium,
    fontSize: 11,
    color: COLORS.primary,
  },

  // Sign in button
  signInButton: {
    backgroundColor: COLORS.primary,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    fontFamily: FONTS.body.semibold,
    fontSize: 13,
    letterSpacing: 2,
    color: '#fff',
  },

  // Register
  registerRow: {
    alignItems: 'center',
    marginTop: 14,
  },
  registerLink: {
    fontFamily: FONTS.body.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  registerLinkBold: {
    fontFamily: FONTS.body.semibold,
    color: COLORS.primary,
  },
});