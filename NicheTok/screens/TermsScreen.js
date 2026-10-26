import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, View, ScrollView, Button, Image, TouchableOpacity, Alert, Dimensions, Platform } from 'react-native';

const TermsScreen = ({ navigation }) => {
  const [accepted, setAccepted] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  const handleAccept = () => {
    setAccepted(true);
    navigation.navigate('Login');
  };

  const handleDecline = () => {
    if (Platform.OS === 'ios') {
      Alert.alert('NicheTok', 'The app will now exit.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.penguinContainer}>
        <Image
          source={{ uri: 'https://i.pinimg.com/originals/2f/35/42/2f35421b4bdaead24c9b8d1f7f228038.gif' }}
          style={styles.penguin}
          resizeMode="contain"
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.termsFrame}>
          <Text style={styles.termsText}>
            By continuing, you agree to the Terms of Service and Privacy Policy of NicheTok.
            NicheTok respects your privacy. All login data goes to TikTok, not to us.
            WE ARE OPENSOURCE - we do not save data. All your login goes to TikTok not to us.
            If you still got a bad feeling, look at our code - we are OPENSOURCE.
            This platform is designed for NicheTok users who want to repost and discover content.
            By accepting, you confirm you are at least 13 years old and agree to our terms.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, accepted ? styles.buttonActive : styles.buttonDisabled]} onPress={handleAccept}>
          <Text style={styles.buttonText}>{accepted ? 'Accepted' : 'Accept'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleDecline}>
          <Text style={styles.buttonText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  penguinContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    paddingTop: 40,
    backgroundColor: 'transparent',
  },
  penguin: {
    width: 150,
    height: 150,
  },
  scrollView: {
    flex: 1,
    paddingTop: 200,
  },
  termsFrame: {
    padding: 24,
    maxWidth: Dimensions.get('window').width - 48,
  },
  termsText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#fff',
    textAlign: 'center',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    justifyContent: 'flex-end',
  },
  button: {
    width: '100%',
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#666666',
    opacity: 0.5,
  },
  buttonActive: {
    backgroundColor: '#00d55f',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});
