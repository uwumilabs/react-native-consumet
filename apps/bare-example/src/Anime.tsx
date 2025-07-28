import { ANIME, SubOrSub, type IAnimeResult, type ISearch } from 'react-native-consumet';
import { Text, View, StyleSheet, ActivityIndicator, FlatList, RefreshControl, SafeAreaView } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

// ZNsenNosoJNT
interface FetchState {
  data: IAnimeResult[];
  isLoading: boolean;
  error: string | null | Error;
}

const fetchData = async (): Promise<ISearch<IAnimeResult>> => {
  try {
    const animekai = new ANIME.Zoro();
    const search = await animekai.search('sakamoto days');
    console.log(search);
    const info = await animekai.fetchAnimeInfo(search.results[0]!.id);
    console.log(info);
    const s = info.episodes && (await animekai.fetchEpisodeSources(info.episodes[0]!.id, undefined,SubOrSub.DUB));
    console.log('sources end');
    console.log(s);
    if (!search || !search.results) {
      throw new Error('Invalid response format from API');
    }
    return search;
  } catch (error) {
    console.log(error);
    throw new Error('Failed to fetch search');
  }
};

export default function Anime() {
  const [state, setState] = useState<FetchState>({
    data: [],
    isLoading: true,
    error: '',
  });
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const sources = await fetchData();
      setState({
        data: sources.results || [],
        isLoading: false,
        error: null,
      });
    } catch (error: unknown) {
      console.log(error);
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
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {state.error.toString()}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {state.isLoading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <FlatList
          data={state.data}
          renderItem={({ item }) => (
            <View style={styles.itemContainer}>
              <Text style={styles.itemText}>{typeof item.title === 'string' ? item.title : String(item.title)}</Text>
            </View>
          )}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No sources found</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  itemContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemText: {
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    margin: 16,
  },
  emptyText: {
    textAlign: 'center',
    margin: 16,
    color: '#666',
  },
});
