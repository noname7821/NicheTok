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
  RefreshControl,
  Dimensions,
} from 'react-native';

const HomeScreen = ({ navigation, accessToken, username, setNavigate }) => {
  const [reposts, setReposts] = useState([]);
  const [loading, setLoading] = useState('idle');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllReposts = async () => {
    if (!accessToken) {
      Alert.alert('Error', 'No TikTok access token available.');
      return;
    }

    setLoading('fetching');
    setRefreshing(true);
    const allVideos = [];
    let cursor = 0;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await fetch(
          `https://open.tiktok-api.com/v2/repost/list/?cursor=${cursor}&count=50`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!response.ok) {
          console.error('TikTok API error response:', response.status);
          hasMore = false;
          continue;
        }

        const data = await response.json();

        if (data.data && data.data.reposts) {
          const batch = data.data.reposts.map((repost) => ({
            id: repost.id,
            description: repost.description || 'No description',
            videoId: repost.video?.id || null,
            authorName: repost.author?.nickname || 'Unknown',
            avatarUrl: repost.author?.avatar_url || null,
            createTime: repost.create_time,
            status: repost.status,
          }));
          allVideos.push(...batch);
          hasMore = data.has_more || false;
          cursor = data.cursor || cursor + 50;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error('Error fetching reposts page:', error);
        hasMore = false;
      }
    }

    setReposts(allVideos);
    setLoading('idle');
    setRefreshing(false);

    if (allVideos.length === 0) {
      Alert.alert(
        'No Reposts Found',
        'No reposts were found from your TikTok account. This may be because:\n\n• The repost feature is not enabled on your account\n• This feature is region-locked\n• The account does not have repost permissions\n• The API endpoint structure has changed'
      );
    }
  };

  const deleteRepost = async (repostId) => {
    if (!accessToken) return;

    setLoading('deleting');

    try {
      const response = await fetch(
        `https://open.tiktok-api.com/v2/repost/delete/${repostId}/`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        setReposts(prev => prev.filter(r => r.id !== repostId));
        Alert.alert('Success', 'Repost deleted successfully from TikTok.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg =
          errorData.message ||
          `Failed to delete repost. API returned status: ${response.status}`;
        console.error('Delete repost error:', errorData);
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('Network error during repost deletion:', error);
      Alert.alert('Error', error.message || 'Network error during repost deletion');
    } finally {
      setLoading('idle');
    }
  };

  const deleteAllReposts = async () => {
    if (!accessToken || reposts.length === 0) {
      Alert.alert('No Reposts', 'No reposts to delete.');
      return;
    }

    const confirmed = await Alert.alert(
      'Delete All Reposts',
      `This will permanently delete all ${reposts.length} reposts from your TikTok account.\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            setLoading('deleting');
            let deletedCount = 0;
            let failedCount = 0;

            for (const repost of reposts) {
              const success = await deleteRepost(repost.id);
              if (success) deletedCount++;
              else failedCount++;
              await new Promise((r) => setTimeout(r, 500));
            }

            Alert.alert(
              'Delete Complete',
              `Results: ${deletedCount} deleted successfully, ${failedCount} failed.${failedCount > 0 ? ' Some reposts could not be deleted (may be protected or already removed).' : ' All reposts deleted.'}`
            );
            setLoading('idle');
            setRefreshing(true);
            await fetchAllReposts();
            setRefreshing(false);
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (accessToken && reposts.length === 0) {
      fetchAllReposts();
    }
  }, [accessToken, reposts.length]);

  return (
    <SafeAreaView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 200 : 0}
    >
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        {accessToken ? (
          <View style={styles.profile}>
            {username && <Text style={styles.username}>{username}</Text>}
            <Button title="Logout" onPress={() => { setNavigate('login'); Alert.alert('Logged out'); }} color="#ff0000" />
          )
        ) : (
          <Button title="Login with TikTok" onPress={() => navigation.navigate('Login')} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchAllReposts} colors={['#00d55f']} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fetch Reposts</Text>

          {loading === 'fetching' && (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Analyzing your TikTok account for reposts...</Text>
            </View>
          )}

          {loading === 'deleting' && (
            <View style={styles.loadingState}>
              <Text style={styles.loadingText}>Deleting reposts from TikTok...</Text>
            </View>
          )}

          {!accessToken && (
            <Button title="Login with TikTok" onPress={() => navigation.navigate('Login')} />
          )}

          {accessToken && (
            <TouchableOpacity style={styles.fetchButton} onPress={fetchAllReposts}>
              <Text style={styles.fetchButtonText}>Fetch Reposts</Text>
            </TouchableOpacity>
          )}

          {loading === 'idle' && reposts.length > 0 && (
            <View style={styles.foundContainer}>
              <Text style={styles.foundText}>
                Found {reposts.length} repost{''.concat(reposts.length === 1 ? 's' : 's')} from your account
              </Text>
            </View>
          )}
        </View>

        {accessToken && reposts.length > 0 && loading === 'idle' && (
          <View style={styles.deleteSection}>
            <Text style={styles.deleteTitle}>Remove All Reposts</Text>
            <Button title="Delete All Reposts" color="#ff4444" onPress={deleteAllReposts} />
          </View>
        )}

        {reposts.length > 0 && (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Your Reposts ({reposts.length})</Text>
            {reposts.map((repost, index) => (
              <View key={repost.id} style={styles.repostItem}>
                {repost.avatarUrl && (
                  <Image source={{ uri: repost.avatarUrl }} style={styles.repostAvatar} />
                )}
                <View style={styles.repostDetails}>
                  <Text style={styles.repostAuthor}>{repost.authorName}</Text>
                  <Text style={styles.repostDescription} numberOfLines={2} ellipsizeMode="tail">
                    {repost.description}
                  </Text>
                </View>
                <View style={styles.repostActions}>
                  <Button title="Remove" color="#ff4444" onPress={() => deleteRepost(repost.id)} size="small" />
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: {
    padding: 20, paddingTop: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: '#1a1a1a', borderBottomWidth: 1, borderBottomColor: '#333',
    justifyContent: 'center', alignItems: 'center',
  },
  profile: { flexDirection: 'row', alignItems: 'center' },
  username: { color: '#fff', fontFamily: 'Inter', fontSize: 16, marginLeft: 12 },
  content: { padding: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontFamily: 'Inter', fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 12 },
  loadingState: {
    marginTop: 16, padding: 16, backgroundColor: '#1a1a1a', borderRadius: 8, marginBottom: 16, alignItems: 'center',
  },
  loadingText: { color: '#888', fontFamily: 'Inter' },
  fetchButton: { backgroundColor: '#00d55f', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  fetchButtonText: { color: '#0a0a0a', fontFamily: 'Inter', fontSize: 16, fontWeight: '600' },
  deleteSection: {
    backgroundColor: '#1a1a1a', padding: 20, borderRadius: 12, marginBottom: 20, border: 1, borderColor: '#ff4444',
  },
  deleteTitle: { color: '#ff4444', fontFamily: 'Inter', fontSize: 16, marginBottom: 12 },
  listSection: { marginTop: 20 },
  listTitle: { color: '#fff', fontFamily: 'Inter', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  repostItem: {
    flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#2a2a2a', borderRadius: 8, marginBottom: 12,
  },
  repostAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  repostDetails: { flex: 1 },
  repostAuthor: { color: '#fff', fontFamily: 'Inter', fontSize: 14, marginBottom: 2 },
  repostDescription: { color: '#ccc', fontFamily: 'Inter', fontSize: 12 },
  repostActions: { marginTop: 4, flexDirection: 'row' },
});
