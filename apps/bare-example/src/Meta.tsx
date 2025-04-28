import {
  ANIME,
  makePostRequestWithOkHttp,
  META,
  type IAnimeEpisode,
  makePostRequestWithWebView,
} from 'react-native-consumet';
import { Text, View, StyleSheet, ActivityIndicator, FlatList, RefreshControl, SafeAreaView } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

interface FetchState {
  data: IAnimeEpisode[];
  isLoading: boolean;
  error: string | null | Error;
}

const fetchData = async (): Promise<IAnimeEpisode[]> => {
  try {
    // const movies = new META.TMDB('5201b54eb0968700e693a30576d7d4dc', new MOVIES.SFlix());
    // const info = await movies.fetchMediaInfo('86031', 'tv');
    // // const info = await movies.fetchMediaInfo('872585', 'movie');
    // console.log(info, info.seasons[0].episodes[0].id);
    // const sources = await movies.fetchEpisodeSources(info.seasons[0].episodes[0].id);
    function formDataToUrlEncoded(formData: Record<string, string>): string {
      return Object.entries(formData)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    }

    const formData = {
      verify: 'b1cb573393b9b084d415e2ae31ba7cbb::1b11712471e5641658d201c060300ea7::1745856533::ni',
    };
    const cookie = await makePostRequestWithOkHttp(
      'https://netfree2.cc/mobile/verify2.php',
      formDataToUrlEncoded(formData),
      'application/x-www-form-urlencoded'
    );
    console.log(cookie);
    const cookie1 = await makePostRequestWithWebView(
      'https://netfree2.cc/mobile/verify2.php',
      formDataToUrlEncoded(formData),
      'application/x-www-form-urlencoded'
    );
    console.log(cookie1);
    const anime = new META.Anilist(new ANIME.AnimePahe());
    const sources = await anime.search('the apothecary diaries season 2');
    console.log(sources);
    const info = await anime.fetchEpisodesListById(sources.results[0]?.id!);
    console.log(info);
    if (!sources || !sources) {
      throw new Error('Invalid response format from API');
    }
    // @ts-ignore
    return sources;
  } catch (error) {
    console.log(error);
    throw new Error('Failed to fetch sources');
  }
};

export default function Meta() {
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
        data: sources || [],
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
