import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';

// German login/registration screen for NicheTok
// "Anmeldung" = Sign up / Log in

// Your TikTok Developer credentials
const TIKTOK_CLIENT_ID = 'aw4v115rvm0ppg51';
const TIKTOK_CLIENT_SECRET = '519w00ADXtczLmDOFNweSkHlNWf1gEws';
const TIKTOK_REDIRECT_URI = 'exp://%1$s.snack.expo.dev/push-notice';

const TIKTOK_SCOPES = [
  'user.info.basic',
  'video.upload',
].join(',');

const AUTH_STORAGE_KEY = '@NicheTok:tiktok_tokens';

const loadStoredTokens = async () => {
  try {
    const stored = await FileSystem.getBundleItemAsync(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored.data) : null;
  } catch (e) {
    console.error('Failed to load stored tokens:', e);
    return null;
  }
};

const saveTokens = async (tokens) => {
  try {
    await FileSystem.setBundleItemAsync(AUTH_STORAGE_KEY, JSON.stringify(tokens));
  } catch (e) {
    console.error('Failed to save tokens:', e);
  }
};

WebBrowser.maybeCompleteUrl();

// -------------------------------------------------------
// AUTHENTICATION SCREEN (German: "Anmeldung")
// -------------------------------------------------------

const AuthScreen = ({ onAuthSuccess, onAuthError }) => {
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Check for stored TikTok tokens on mount
  useEffect(() => {
    (async () => {
      const stored = await loadStoredTokens();
      if (stored && stored.accessToken) {
        onAuthSuccess({
          accessToken: stored.accessToken,
          username: stored.username || 'TikTok User',
          pfp: stored.pfp || null,
          method: 'tiktok',
        });
      }
    })();
  }, [onAuthSuccess]);

  // Handle TikTok OAuth login
  const handleTikTokLogin = async () => {
    setLoginInProgress(true);

    try {
      const authParams = new URLSearchParams({
        client_key: TIKTOK_CLIENT_ID,
        response_type: 'code',
        scope: TIKTOK_SCOPES,
        redirect_uri: TIKTOK_REDIRECT_URI,
        state: 'nichetok_app_unique_state',
      });

      const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${authParams.toString()}`;

      const { type, url, cause } = await AuthSession.authenticateAsync(
        authUrl,
        AuthSession.makeRedirectUri({})
      );

      if (type === 'success') {
        const tokenResponse = await AuthSession.fetchTokenAsync(
          'https://open.tiktok-api.com/v2/auth/token/',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_key: TIKTOK_CLIENT_ID,
              client_secret: TIKTOK_CLIENT_SECRET,
              code: url.params.code,
              grant_type: 'authorization_code',
            }),
          }
        );

        if (tokenResponse.type === 'success') {
          // Fetch user info
          const userResponse = await fetch(
            'https://open.tiktok-api.com/v2/user/info/',
            {
              headers: { Authorization: `Bearer ${tokenResponse.accessToken}` },
            }
          );

          let username = 'TikTok User';
          let pfp = null;

          if (userResponse.ok) {
            const userData = await userResponse.json();
            const rawUser = userData.data?.user || userData.user;
            username = rawUser?.display_name || rawUser?.username || 'TikTok User';
            pfp = rawUser?.profile_image_url || null;
          }

          await saveTokens({
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken || null,
            expiresIn: tokenResponse.expiresIn,
            username,
            pfp,
          });

          onAuthSuccess({
            accessToken: tokenResponse.accessToken,
            username,
            pfp,
            method: 'tiktok',
          });
        } else {
          const errorMsg = tokenResponse.message || 'Unknown token exchange error';
          console.error('TikTok token exchange failed:', errorMsg);
          onAuthError(errorMsg);
          Alert.alert('Login Fehlgeschlagen', `TikTok Authentifizierung fehlgeschlagen: ${errorMsg}`);
        }
      } else if (type === 'cancelled') {
        console.log('TikTok auth cancelled by user');
        onAuthError('Benutzer hat TikTok-Authentifizierung abgebrochen');
        Alert.alert('Abbrochen', 'Die TikTok-Authentifizierung wurde vom Benutzer abgebrochen.');
      } else {
        console.error('TikTok auth failed:', type, cause);
        onAuthError('TikTok-Authentifizierung fehlgeschlagen');
        Alert.alert('Authentifizierungsfehler', 'TikTok login fehlgeschlagen mit unbekannten Fehler.');
      }
    } catch (error) {
      console.error('Unexpected error during TikTok login:', error);
      onAuthError(error.message || 'Unexpected login error');
      Alert.alert('Login-Fehler', error.message || 'Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setLoginInProgress(false);
    }
  };

  // Handle local registration (if needed)
  const handleRegister = async () => {
    // Basic validation
    if (email.trim().length === 0) {
      Alert.alert('E-Mail erforderlich', 'Bitte gib deine E-Mail-Adresse ein.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Passwort zu kurz', 'Das Passwort muss mindestens 6 Zeichen haben.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwort stimmen nicht überein', 'Bitte gib dasselbe Passwort zweimal ein.');
      return;
    }

    // In a real app, you would send this to your backend
    // For now, simulate successful registration
    Alert.alert(
      'Registrierung erfolgreich',
      'Dein Konto wurde erstellt. Du kannst dich jetzt einloggen.'
    );
    setRegisterMode(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  // Handle local login (if not using TikTok)
  const handleLocalLogin = async () => {
    // Simulate login
    if (email.trim().length === 0 || password.length < 6) {
      Alert.alert('Daten unvollständig', 'Bitte gib gültige E-Mail und Passwort ein.');
      return;
    }

    // In a real app, you would verify credentials with your backend
    Alert.alert(
      'Login erfolgreich',
      `Willkommen zurück, ${email}!`
    );
    onAuthSuccess({
      accessToken: 'local-session-token',
      username: email,
      pfp: null,
      method: 'local',
    });
  };

  // UI based on mode
  if (registerMode) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>NicheTok</Text>
          <Text style={styles.headerSubtitle}>Registrierung</Text>
        </View>

        <View style={styles.formBox}>
          <TextInput
            placeholder="E-Mail-Adresse"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            placeholder="Passwort"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            style={styles.input}
          />
          <TextInput
            placeholder="Passwort wiederholen"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={true}
            style={styles.input}
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>Registrieren</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkButton} onPress={() => setRegisterMode(false)}>
            <Text style={styles.linkText}>Bereits ein Konto? Einloggen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Login mode (default)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NicheTok</Text>
        <Text style={styles.headerSubtitle}>Einloggen</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Willkommen zurück</Text>

        {/* TikTok Login Option */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleTikTokLogin}
          disabled={loginInProgress}
        >
          <View style={styles.socialIconContainer}>
            <Image
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/51/TikTok_Logo.png' }}
              style={styles.socialIcon}
            />
          </View>
          <Text style={styles.socialText}>
            {loginInProgress ? 'Verbinde TikTok...' : 'Mit TikTok einloggen'}
          </Text>
        </TouchableOpacity>

        {/* Local Login Option */}
        <View style={styles.divider}>
          <Text style={styles.dividerText}>Oder</Text>
        </View>

        <TextInput
          placeholder="E-Mail"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <TextInput
          placeholder="Passwort"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
          style={styles.input}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleLocalLogin}>
            <Text style={styles.buttonText}>Einloggen</Text>
          </TouchableOpacity>
        </View>

        {/* Register link */}
        <TouchableOpacity style={styles.link} onPress={() => setRegisterMode(true)}>
          <Text style={styles.linkText}>Nein, ich registriere mich</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// -------------------------------------------------------
// STYLES
// -------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 24,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#888',
    fontFamily: 'Inter',
    fontSize: 14,
    marginLeft: 8,
  },

  content: {
    padding: 20,
  },

  subtitle: {
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 20,
  },

  socialButton: {
    backgroundColor: '#e1e8ec',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
  },
  socialIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  socialIcon: {
    width: 20,
    height: 20,
    tintColor: '#000',
  },
  socialText: {
    color: '#000',
    fontFamily: 'Inter',
    fontSize: 16,
  },

  divider: {
    height: 1,
    width: '100%',
    backgroundColor: '#333',
    marginVertical: 12,
  },
  dividerText: {
    color: '#888',
    fontFamily: 'Inter',
    fontSize: 12,
    textAlign: 'center',
    padding: 8,
  },

  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 16,
    color: '#fff',
    fontFamily: 'Inter',
    fontSize: 16,
    marginBottom: 12,
  },

  formBox: {
    width: '100%',
  },

  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },

  linkButton: {
    padding: 8,
  },
  linkText: {
    color: '#00d55f',
    fontFamily: 'Inter',
    fontSize: 14,
  },

  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#00d55f',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#0a0a0a',
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
  },

  link: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#888',
    fontFamily: 'Inter',
    fontSize: 14,
  },
});
