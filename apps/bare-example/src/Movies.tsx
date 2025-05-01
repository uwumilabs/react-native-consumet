import { Text, View, StyleSheet, ActivityIndicator, FlatList, RefreshControl, SafeAreaView } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { MOVIES, type IMovieResult, type ISearch } from 'react-native-consumet';

interface FetchState {
  data: IMovieResult[];
  isLoading: boolean;
  error: string | null | Error;
}

const fetchData = async (): Promise<ISearch<IMovieResult>> => {
  try {
    const movies = new MOVIES.NetflixMirror();
    const search = await movies.search('jujutsu kaisen');
    console.log(search);
    const info = await movies.fetchMediaInfo(search.results![0]!.id);
    console.log(info, info.episodes![0]!.id);

    const sources = await movies.fetchEpisodeSources('81144552', '81144552');
    // const servers = await movies.fetchEpisodeServers(info.episodes![0]!.id);
    console.log(sources);
    // const s = await movies.fetchEpisodeSources(
    //   'jujutsu-kaisen-season-2-73v2$ep=1$token=OoS5tu7k4wasmn8Q2cmH'
    // );
    // console.log(s);
    if (!search || !search?.results) {
      throw new Error('Invalid response format from API');
    }
    return search;
  } catch (error) {
    console.log(error);
    throw new Error('Failed to fetch sources');
  }
};

export default function Movies() {
  const [state, setState] = useState<FetchState>({
    data: [],
    isLoading: true,
    error: null,
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
