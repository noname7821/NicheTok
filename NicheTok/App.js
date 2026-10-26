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
} from 'react-native';
import * as Font from 'expo-font';
import * as FileSystem from 'expo-file-system';

// TikTok credentials (your provided keys)
const TIKTOK_CLIENT_ID = 'aw4v115rvm0ppg51';
const TIKTOK_CLIENT_SECRET = '519w00ADXtczLmDOFNweSkHlNWf1gEws';
const TIKTOK_REDIRECT_URI = 'exp://%1$s.snack.expo.dev/push-notice';
const TIKTOK_SCOPES = ['user.info.basic', 'video.upload'].join(',');
const AUTH_STORAGE_KEY = '@NicheTok:tiktok_tokens';

// -------------------------------------------------------
// NAVIGATION
// -------------------------------------------------------
import { createStackNavigator } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';

import TermsScreen from './NicheTok/screens/TermsScreen';
import LoginScreen from './NicheTok/screens/LoginScreen';
import HomeScreen from './NicheTok/screens/HomeScreen';

const Stack = createStackNavigator();

const NicheTokApp = (props) => {
  const [fontsLoaded] = useState(true);
  const [user, setUser] = useState(null);
  const [reposts, setReposts] = useState([]);

  const handleLoginSuccess = (loginData) => {
    setUser(loginData);
    if (loginData.accessToken) {
      ;(async () => {
        const fetched = await fetchAllRepostsFromToken(loginData.accessToken);
        setReposts(fetched);
      })();
    }
  };

  const handleLogout = async () => {
    try {
      await FileSystem.getBundleItemAsync('@NicheTok:tiktok_tokens');
    } catch (e) { console.error(e); }
    setUser(null);
    setReposts([]);
  };

  const fetchAllRepostsFromToken = async (accessToken) => {
    if (!accessToken) return [];
    const results = [];
    let cursor = 0;
    let hasMore = true;
    while (hasMore) {
      try {
        const response = await fetch(
          `https://open.tiktok-api.com/v2/repost/list/?cursor=${cursor}&count=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (!response.ok) { hasMore = false; continue; }
        const data = await response.json();
        if (data.data && data.data.reposts) {
          data.data.reposts.forEach((repost) => {
            results.push({
              id: repost.id,
              description: repost.description || 'No description',
              videoId: repost.video?.id || null,
              authorName: repost.author?.nickname || 'Unknown',
              avatarUrl: repost.author?.avatar_url || null,
            });
          });
          hasMore = data.has_more || false;
          cursor = data.cursor || cursor + 50;
        } else { hasMore = false; }
      } catch (error) {
        console.error('Error fetching reposts page:', error);
        hasMore = false;
      }
    }
    return results;
  };

  let initialRoute = 'Terms';
  if (user && user.accessToken) initialRoute = 'Home';
  else if (!user) initialRoute = 'Terms';

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{ headerShown: false, animation: 'fade' }}
      >
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return <NicheTokApp />;
}
