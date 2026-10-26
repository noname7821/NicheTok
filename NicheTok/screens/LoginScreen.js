import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Button,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as FileSystem from 'expo-file-system';

// TikTok Developer credentials (provided by user)
const TIKTOK_CLIENT_ID = 'aw4v115rvm0ppg51';
const TIKTOK_CLIENT_SECRET = '519w00ADXtczLmDOFNweSkHlNWf1gEws';
const TIKTOK_REDIRECT_URI = 'exp://%1$s.snack.expo.dev/push-notice';

// OAuth scopes
const TIKTOK_SCOPES = [
  'user.info.basic',
  'video.upload',
].join(',');

const AUTH_STORAGE_KEY = '@NicheTok:tiktok_tokens';

// Load stored tokens
const loadStoredTokens = async () => {
  try {
    const stored = await FileSystem.getBundleItemAsync(AUTH_STORAGE_KEY);
    return stored ? JSON.parse(stored.data) : null;
  } catch (e) {
    console.error('Failed to load stored tokens:', e);
    return null;
  }
};

// Save tokens
const saveTokens = async (tokens) => {
  try {
    await FileSystem.setBundleItemAsync(AUTH_STORAGE_KEY, JSON.stringify(tokens));
  } catch (e) {
    console.error('Failed to save tokens:', e);
  }
};

WebBrowser.maybeCompleteUrl();

// -------------------------------------------------------
// LOGIN SCREEN - TikTok OAuth only
// -------------------------------------------------------

const LoginScreen = ({ onLoginSuccess, onLoginError }) => {
  const [loginInProgress, setLoginInProgress] = useState(false);

  // Check for stored tokens on mount
  useEffect(() => {
    (async () => {
      const stored = await loadStoredTokens();
      if (stored && stored.accessToken) {
        setLoginInProgress(true);
        onLoginSuccess({
          accessToken: stored.accessToken,
          username: stored.username || 'TikTok User',
          pfp: stored.pfp || null,
        });
      }
    })();
  }, [onLoginSuccess]);

  // Handle TikTok login
  const handleLogin = async () => {
    setLoginInProgress(true);

    try {
      // Build auth URL
      const authParams = new URLSearchParams({
        client_key: TIKTOK_CLIENT_ID,
        response_type: 'code',
        scope: TIKTOK_SCOPES,
        redirect_uri: TIKTOK_REDIRECT_URI,
        state: 'nichetok_app_unique_state',
      });

      const authUrl = `https://www.tiktok.com/v2/auth/authorize/?${authParams.toString()}`;

      // Begin OAuth flow
      const { type, url, cause } = await AuthSession.authenticateAsync(
        authUrl,
        AuthSession.makeRedirectUri({})
      );

      if (type === 'success') {
        // Exchange code for access token
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
            { headers: { Authorization: `Bearer ${tokenResponse.accessToken}` } }
          );

          let username = 'TikTok User';
          let pfp = null;

          if (userResponse.ok) {
            const userData = await userResponse.json();
            const rawUser = userData.data?.user || userData.user;
            username = rawUser?.display_name || rawUser?.username || 'TikTok User';
            pfp = rawUser?.profile_image_url || null;
          }

          // Save tokens for future launches
          await saveTokens({
            accessToken: tokenResponse.accessToken,
            refreshToken: tokenResponse.refreshToken || null,
            expiresIn: tokenResponse.expiresIn,
            username,
            pfp,
          });

          // Success callback
          if (onLoginSuccess) {
            onLoginSuccess({
              accessToken: tokenResponse.accessToken,
              username,
              pfp,
            });
          }
        } else {
          // Token exchange failed
          const errorMsg = tokenResponse.message || 'Unknown token exchange error';
          console.error('TikTok token exchange failed:', errorMsg);
          if (onLoginError) onLoginError(errorMsg);
          Alert.alert('Login Failed', `Could not obtain TikTok access token: ${errorMsg}`);
        }
      } else if (type === 'cancelled') {
        // User cancelled
        console.log('TikTok auth cancelled by user');
        if (onLoginError) onLoginError('User cancelled TikTok authentication');
        Alert.alert('Cancelled', 'TikTok authentication was cancelled by the user.');
      } else {
        // Authentication failed
        console.error('TikTok auth failed:', type, cause);
        if (onLoginError) onLoginError('Authentication failed');
        Alert.alert('Authentication Failed', 'TikTok login failed with an unknown error.');
      }
    } catch (error) {
      console.error('Unexpected error during TikTok login:', error);
      if (onLoginError) onLoginError(error.message || 'Unexpected login error');
      Alert.alert('Login Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoginInProgress(false);
    }
  };

  // UI
  if (loginInProgress) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.center}>
          <Text>Connecting to TikTok...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Check if user already has stored tokens
  if (loginInProgress) {
    return null; // In production, would navigate home
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>NicheTok</Text>
        <Text style={styles.subtitle}>Repost Manager</Text>
      </View>

      <View style={styles.loginBox}>
        <Text style={styles.loginText}>Connect your TikTok account</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loginInProgress}
        >
          {loginInProgress ? 'Connecting...' : 'Login with TikTok'}
        </TouchableOpacity>
        <Text style={styles.buttonHint}>
          * Requires TikTok Developer App credentials
        </Text>
      </View>
    </SafeAreaView>
  );
};

// -------------------------------------------------------
// STYLES (English only, no German)
// -------------------------------------------------------

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    padding: 20, paddingTop: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#1a1a1a', borderBottomWidth: 1, borderBottomColor: '#333',
    justifyContent: 'center', alignItems: 'center',
  },
  title: { color: '#fff', fontFamily: 'Inter', fontSize: 24, fontWeight: '600' },
  subtitle: { color: '#888', fontFamily: 'Inter', fontSize: 14, marginLeft: 8 },
  loginBox: { padding: 40 20, marginTop: 40 },
  loginText: { color: '#fff', fontFamily: 'Inter', fontSize: 16, fontWeight: '500', textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#00d55f', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#666666', opacity: 0.5 },
  buttonText: { color: '#0a0a0a', fontFamily: 'Inter', fontSize: 16, fontWeight: '600' },
  buttonHint: { color: '#666', fontFamily: 'Inter', fontSize: 12, textAlign: 'center', marginTop: 8 },
});
