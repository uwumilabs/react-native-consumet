import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Image,
  Dimensions,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { MOVIES, StreamingServers, type IMovieResult, type ISearch } from 'react-native-consumet';
import Video from 'react-native-video';

interface FetchState {
  data: IMovieResult[];
  isLoading: boolean;
  error: string | null | Error;
  videoSource: string | null; // Added to store the video URL
}

const fetchData = async (): Promise<{
  search: ISearch<IMovieResult>;
  videoUrl: string | null;
}> => {
  try {
    const movies = new MOVIES.MultiMovies();
    const search = await movies.search('Kantara chapter 1');
    console.log('Search Results:', search);

    if (!search || !search.results || search.results.length === 0) {
      throw new Error('No movies found for "flight"');
    }

    const firstMovie = search.results[0];
    const info = await movies.fetchMediaInfo(firstMovie?.id!);
    console.log('Movie Info:', info);

    let videoUrl: string | null = null;
    if (info.episodes && info.episodes.length > 0) {
      const firstEpisodeId = info.episodes[0]!.id;
      const servers = await movies.fetchEpisodeServers(firstEpisodeId, info.id);
      console.log('Episode Servers:', servers);
      const sources = await movies.fetchEpisodeSources(firstEpisodeId, info.id);
      console.log('Episode Sources:', sources);

      if (sources.sources && sources.sources.length > 0) {
        // Find the highest quality source, or just take the first one
        const highestQualitySource = sources.sources.reduce((prev: any, current: any) =>
          (prev.quality || 0) > (current.quality || 0) ? prev : current
        );
        videoUrl = highestQualitySource.url;
      }
    } else {
      // For movies, there might not be episodes, so look for a direct source if available
      // This part depends on how 'consumet' handles movie sources without episodes.
      // For simplicity, we'll assume for now that if no episodes, there might be no direct play URL easily available via this path.
      // You might need to check 'info.url' or similar for direct movie links if they exist outside of episodes.
    }

    return { search, videoUrl };
  } catch (error) {
    console.error('Error in fetchData:', error);
    throw new Error('Failed to fetch data or sources');
  }
};

const { width } = Dimensions.get('window');

export default function Movies() {
  const [state, setState] = useState<FetchState>({
    data: [],
    isLoading: true,
    error: null,
    videoSource: null,
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const { search, videoUrl } = await fetchData();
      setState({
        data: search.results || [],
        isLoading: false,
        error: null,
        videoSource: videoUrl, // Set the video source here
      });
    } catch (error: unknown) {
      console.error('Error in loadData:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData().finally(() => setRefreshing(false));
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  if (state.error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Oops! Something went wrong.</Text>
          <Text style={styles.errorDetails}>Error: {state.error.toString()}</Text>
          <Text style={styles.errorDetails}>Please try again later.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {state.isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>Loading movies...</Text>
        </View>
      ) : (
        <View style={styles.contentContainer}>
          {state.videoSource && (
            <View style={styles.videoPlayerContainer}>
              <Video
                source={{ uri: state.videoSource }}
                style={styles.videoPlayer}
                controls={true} // Add playback controls
                resizeMode="contain" // Fit the video within its bounds
                onError={(e) => console.log('Video Error:', e)}
                onLoad={(e) => console.log('Video Loaded:', e)}
                poster="https://via.placeholder.com/400x250?text=Loading+Video" // Placeholder image while video loads
              />
            </View>
          )}

          <Text style={styles.listTitle}>Search Results for "flight"</Text>
          <FlatList
            data={state.data}
            renderItem={({ item }) => (
              <View style={styles.itemContainer}>
                {item.image && <Image source={{ uri: item.image }} style={styles.moviePoster} />}
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemTitle}>
                    {typeof item.title === 'string' ? item.title : String(item.title)}
                  </Text>
                  {item.releaseDate && <Text style={styles.itemSubtitle}>Released: {item.releaseDate}</Text>}
                  {item.type && <Text style={styles.itemSubtitle}>Type: {item.type}</Text>}
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id.toString()}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4a90e2" />}
            ListEmptyComponent={<Text style={styles.emptyText}>No movies found for "flight".</Text>}
            contentContainerStyle={styles.flatListContent}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 18,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fee',
    borderRadius: 8,
    margin: 20,
    borderWidth: 1,
    borderColor: '#fcc',
  },
  errorText: {
    color: '#d9534f',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorDetails: {
    color: '#d9534f',
    fontSize: 16,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  videoPlayerContainer: {
    width: '100%',
    height: width * 0.5625, // 16:9 aspect ratio
    backgroundColor: '#000',
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  listTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  flatListContent: {
    paddingBottom: 20, // Add some padding at the bottom of the list
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  moviePoster: {
    width: 80,
    height: 120,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#e0e0e0', // Placeholder background
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  itemSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    margin: 20,
    fontSize: 16,
    color: '#888',
  },
});
