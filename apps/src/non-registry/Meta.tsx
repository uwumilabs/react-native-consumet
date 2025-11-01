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
  TouchableOpacity,
} from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { MOVIES, ANIME, META, type IMovieResult, type IAnimeEpisode, type IAnimeResult } from 'react-native-consumet';
import Video from 'react-native-video';

// Get screen width for responsive video player
const { width } = Dimensions.get('window');

// --- Main App Component ---
export default function Meta() {
  // State to manage which tab is active
  const [activeTab, setActiveTab] = useState<'movies' | 'anime'>('anime');

  // --- State for Movies Tab ---
  interface MovieFetchState {
    data: (IMovieResult | IAnimeResult)[];
    isLoading: boolean;
    error: string | null | Error;
    videoSource: string | null;
  }
  const [movieState, setMovieState] = useState<MovieFetchState>({
    data: [],
    isLoading: true,
    error: null,
    videoSource: null,
  });
  const [movieRefreshing, setMovieRefreshing] = useState(false);

  // --- State for Anime Tab ---
  interface AnimeFetchState {
    data: IAnimeEpisode[];
    isLoading: boolean;
    error: string | null | Error;
    videoSource: string | null;
  }
  const [animeState, setAnimeState] = useState<AnimeFetchState>({
    data: [],
    isLoading: true,
    error: null,
    videoSource: null,
  });
  const [animeRefreshing, setAnimeRefreshing] = useState(false);

  // --- Data Fetching Functions ---

  // Function to fetch Movies data
  const fetchMoviesData = async () => {
    try {
      const movies = new META.TMDB('5201b54eb0968700e693a30576d7d4dc', new MOVIES.HiMovies());
      const search = await movies.search('squid game');
      console.log('Movies Search Results:', search);

      if (!search || !search.results || search.results.length === 0) {
        throw new Error('No movies found for "flight"');
      }

      const firstMovie = search.results[0]!;
      console.log('First Movie:', firstMovie);
      const info = await movies.fetchMediaInfo(firstMovie.id!, firstMovie?.type as string);
      console.log('Movie Info:', info);

      let videoUrl: string | null = null;
      if (info.seasons[0].episodes && info.seasons[0].episodes.length > 0) {
        const firstEpisodeId = info.seasons[0].episodes[0].id;
        const sources = await movies.fetchEpisodeSources(firstEpisodeId, info.id);
        console.log('Movie Episode Sources:', sources);

        if (sources.sources && sources.sources.length > 0) {
          const highestQualitySource = sources.sources.reduce((prev, current) =>
            (prev.quality || 0) > (current.quality || 0) ? prev : current
          );
          videoUrl = highestQualitySource.url;
        }
      }

      setMovieState({
        data: search.results || [],
        isLoading: false,
        error: null,
        videoSource: videoUrl,
      });
    } catch (error: unknown) {
      console.error('Error in fetchMoviesData:', error);
      setMovieState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setMovieRefreshing(false);
    }
  };

  // Function to fetch Anime data
  const fetchAnimeData = async () => {
    try {
      const anime = new META.Anilist(new ANIME.AnimeKai());
      const searchResult = await anime.search('sakamoto days');
      console.log('Anime Search Result:', searchResult);

      if (!searchResult || !searchResult.results || searchResult.results.length === 0) {
        throw new Error('No anime found for "the apothecary diaries season 2"');
      }

      const animeEpisodes = await anime.fetchEpisodesListById(searchResult.results[0]?.id!);
      console.log('Anime Info (Episodes List):', animeEpisodes);

      if (!animeEpisodes || animeEpisodes.length === 0) {
        throw new Error('No episodes found for the selected anime');
      }

      let videoUrl: string | null = null;
      if (animeEpisodes && animeEpisodes.length > 0) {
        const firstEpisodeId = animeEpisodes![0]?.id;
        const sources = await anime.fetchEpisodeSources(firstEpisodeId!);
        console.log('Anime Episode Sources:', sources);

        if (sources.sources && sources.sources.length > 0) {
          const highestQualitySource = sources.sources.reduce((prev, current) =>
            (prev.quality || 0) > (current.quality || 0) ? prev : current
          );
          videoUrl = highestQualitySource.url;
        }
      }

      setAnimeState({
        data: animeEpisodes || [],
        isLoading: false,
        error: null,
        videoSource: videoUrl,
      });
    } catch (error: unknown) {
      console.error('Error in fetchAnimeData:', error);
      setAnimeState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    } finally {
      setAnimeRefreshing(false);
    }
  };

  // --- Effects for Initial Load and Refresh ---

  useEffect(() => {
    // Only load movies data when the component mounts or when movies tab is active
    if (activeTab === 'movies' && movieState.data.length === 0 && movieState.isLoading) {
      fetchMoviesData();
    }
  }, [activeTab, movieState.data.length, movieState.isLoading]); // Trigger when tab changes

  useEffect(() => {
    // Only load anime data when the component mounts or when anime tab is active
    if (activeTab === 'anime' && animeState.data.length === 0 && animeState.isLoading) {
      fetchAnimeData();
    }
  }, [activeTab, animeState.data.length, animeState.isLoading]); // Trigger when tab changes

  // Refresh handlers
  const onMovieRefresh = useCallback(() => {
    setMovieRefreshing(true);
    fetchMoviesData();
  }, []);

  const onAnimeRefresh = useCallback(() => {
    setAnimeRefreshing(true);
    fetchAnimeData();
  }, []);

  // --- Render Logic ---
  return (
    <SafeAreaView style={styles.appContainer}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'movies' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('movies');
            // If movies data hasn't been loaded yet, trigger load
            if (movieState.data.length === 0 && !movieState.isLoading) {
              setMovieState((prev) => ({ ...prev, isLoading: true })); // Set loading true to show indicator
              fetchMoviesData();
            }
          }}>
          <Text style={[styles.tabButtonText, activeTab === 'movies' && styles.activeTabButtonText]}>Movies</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'anime' && styles.activeTabButton]}
          onPress={() => {
            setActiveTab('anime');
            // If anime data hasn't been loaded yet, trigger load
            if (animeState.data.length === 0 && !animeState.isLoading) {
              setAnimeState((prev) => ({ ...prev, isLoading: true })); // Set loading true to show indicator
              fetchAnimeData();
            }
          }}>
          <Text style={[styles.tabButtonText, activeTab === 'anime' && styles.activeTabButtonText]}>Anime</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {/* Movies Tab Content */}
        {activeTab === 'movies' && (
          <>
            {movieState.error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Oops! Something went wrong.</Text>
                <Text style={styles.errorDetails}>Error: {movieState.error.toString()}</Text>
                <Text style={styles.errorDetails}>Please try again later.</Text>
              </View>
            ) : movieState.isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text style={styles.loadingText}>Loading movies...</Text>
              </View>
            ) : (
              <View style={styles.contentContainer}>
                {movieState.videoSource && (
                  <View style={styles.videoPlayerContainer}>
                    <Video
                      source={{ uri: movieState.videoSource }}
                      style={styles.videoPlayer}
                      controls={true}
                      resizeMode="contain"
                      onLoad={(e) => console.log('Video Loaded (Movies)', e)}
                      onError={(e) => console.log('Video Error (Movies):', e)}
                      poster="https://placehold.co/400x250/cccccc/333333?text=Loading+Video"
                      posterResizeMode="cover"
                    />
                  </View>
                )}
                <Text style={styles.listTitle}>Search Results for "squid game"</Text>
                <FlatList
                  data={movieState.data}
                  renderItem={({ item }) => (
                    <View style={styles.itemContainer}>
                      {item.image && <Image source={{ uri: item.image }} style={styles.posterImage} />}
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
                  refreshControl={
                    <RefreshControl refreshing={movieRefreshing} onRefresh={onMovieRefresh} tintColor="#4a90e2" />
                  }
                  ListEmptyComponent={<Text style={styles.emptyText}>No movies found for "flight".</Text>}
                  contentContainerStyle={styles.flatListContent}
                />
              </View>
            )}
          </>
        )}

        {/* Anime Tab Content */}
        {activeTab === 'anime' && (
          <>
            {animeState.error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Oops! Something went wrong.</Text>
                <Text style={styles.errorDetails}>Error: {animeState.error.toString()}</Text>
                <Text style={styles.errorDetails}>Please try again later.</Text>
              </View>
            ) : animeState.isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text style={styles.loadingText}>Loading anime episodes...</Text>
              </View>
            ) : (
              <View style={styles.contentContainer}>
                {animeState.videoSource && (
                  <View style={styles.videoPlayerContainer}>
                    <Video
                      source={{ uri: animeState.videoSource }}
                      style={styles.videoPlayer}
                      controls={true}
                      resizeMode="contain"
                      onLoad={(e) => console.log('Video Loaded (Anime)', e)}
                      onError={(e) => console.log('Video Error (Anime):', e)}
                      poster="https://placehold.co/400x250/cccccc/333333?text=Loading+Video"
                      posterResizeMode="cover"
                    />
                  </View>
                )}
                <Text style={styles.listTitle}>Episodes for "Sakamoto Days"</Text>
                <FlatList
                  data={animeState.data}
                  renderItem={({ item }) => (
                    <View style={styles.itemContainer}>
                      {item.image && <Image source={{ uri: item.image }} style={styles.posterImage} />}
                      <View style={styles.itemTextContainer}>
                        <Text style={styles.itemTitle}>
                          {typeof item.title === 'string' ? item.title : String(item.title)}
                        </Text>
                        {item.number && <Text style={styles.itemSubtitle}>Episode: {item.number}</Text>}
                        {item.releaseDate && <Text style={styles.itemSubtitle}>Aired: {item.releaseDate}</Text>}
                      </View>
                    </View>
                  )}
                  keyExtractor={(item) => item.id.toString()}
                  refreshControl={
                    <RefreshControl refreshing={animeRefreshing} onRefresh={onAnimeRefresh} tintColor="#4a90e2" />
                  }
                  ListEmptyComponent={<Text style={styles.emptyText}>No episodes found.</Text>}
                  contentContainerStyle={styles.flatListContent}
                />
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 10,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  activeTabButton: {
    backgroundColor: '#4a90e2',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabButtonText: {
    color: '#fff',
  },
  tabContent: {
    flex: 1,
  },
  container: {
    // Used by individual content blocks (Movies/Anime)
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
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  posterImage: {
    width: 80,
    height: 120,
    borderRadius: 8,
    marginRight: 15,
    backgroundColor: '#e0e0e0',
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
