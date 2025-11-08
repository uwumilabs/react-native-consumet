// import { ANIME, StreamingServers, SubOrDub, type IAnimeResult, type ISearch } from 'react-native-consumet';
// import { Text, View, StyleSheet, ActivityIndicator, FlatList, RefreshControl, SafeAreaView } from 'react-native';
// import { useCallback, useEffect, useState } from 'react';
// import { makeGetRequestWithWebView, makePostRequestWithWebView, makePostRequest } from '../../../src/NativeConsumet';

// // ZNsenNosoJNT
// interface FetchState {
//   data: IAnimeResult[];
//   isLoading: boolean;
//   error: string | null | Error;
// }

// const fetchData = async (): Promise<ISearch<IAnimeResult>> => {
//   try {
//     // Test GET request with WebView
//     console.time('GET Request - WebView');
//     const getTest = await makeGetRequestWithWebView('https://anikai.to/', {
//       'User-Agent':
//         'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
//     });
//     console.timeEnd('GET Request - WebView');
//     console.log('GET Response:', {
//       url: getTest.url,
//       status: getTest.status,
//       htmlLength: getTest.html?.length,
//       cookies: getTest.cookies,
//     });
//     console.log('GET HTML Preview:', getTest.html?.substring(0, 200));

//     // Test POST request with WebView (JSON response)
//     const postBodyWebView = JSON.stringify({
//       name: 'Apple MacBook Pro 16',
//       data: {
//         'year': 2019,
//         'price': 1849.99,
//         'CPU model': 'Intel Core i9',
//         'Hard disk size': '1 TB',
//       },
//     });

//     console.time('POST Request - WebView');
//     const postTestWebView = await makePostRequestWithWebView(
//       'https://api.restful-api.dev/objects',
//       {
//         'Content-Type': 'application/json',
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
//       },
//       postBodyWebView
//     );
//     console.timeEnd('POST Request - WebView');
//     console.log('POST Response (WebView):', {
//       url: postTestWebView.url,
//       status: postTestWebView.status,
//       contentType: postTestWebView.contentType,
//       response: postTestWebView.response, // Full response content
//     });

//     // Test POST request with OkHttp (JSON response)
//     const postBodyOkHttp = JSON.stringify({
//       name: 'Apple MacBook Pro 16',
//       data: {
//         'year': 2019,
//         'price': 1849.99,
//         'CPU model': 'Intel Core i9',
//         'Hard disk size': '1 TB',
//       },
//     });

//     console.time('POST Request - OkHttp');
//     const postTestOkHttp = await makePostRequest(
//       'https://api.restful-api.dev/objects',
//       {
//         'Content-Type': 'application/json',
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
//       },
//       postBodyOkHttp
//     );
//     console.timeEnd('POST Request - OkHttp');
//     console.log('POST Response (OkHttp):', {
//       statusCode: postTestOkHttp.statusCode,
//       body: postTestOkHttp.body, // Full response body
//       headers: postTestOkHttp.headers,
//     });

//     // Test with form data (OkHttp)
//     const formData = 'name=John&age=30&city=NewYork';
//     console.time('POST Request - OkHttp (Form Data)');
//     const formTestOkHttp = await makePostRequest(
//       'https://httpbin.org/post',
//       {
//         'Content-Type': 'application/x-www-form-urlencoded',
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
//       },
//       formData
//     );
//     console.timeEnd('POST Request - OkHttp (Form Data)');
//     console.log('POST Form Response (OkHttp):', {
//       statusCode: formTestOkHttp.statusCode,
//       body: formTestOkHttp.body, // Will show the form data echoed back
//     });

//     // Test with plain text (OkHttp)
//     const textData = 'This is plain text data';
//     console.time('POST Request - OkHttp (Plain Text)');
//     const textTestOkHttp = await makePostRequest(
//       'https://httpbin.org/post',
//       {
//         'Content-Type': 'text/plain',
//         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
//       },
//       textData
//     );
//     console.timeEnd('POST Request - OkHttp (Plain Text)');
//     console.log('POST Text Response (OkHttp):', {
//       statusCode: textTestOkHttp.statusCode,
//       body: textTestOkHttp.body,
//     });

//     const anime = new ANIME.AnimeKai();
//     const search = await anime.search('dandadan');
//     console.log(search);
//     const info = await anime.fetchAnimeInfo(search.results[0]!.id);
//     console.log(info);
//     const servers = info.episodes && (await anime.fetchEpisodeServers(info.episodes[0]!.id, SubOrDub.DUB));
//     const sources =
//       info.episodes &&
//       (await anime.fetchEpisodeSources(info.episodes[0]!.id, servers![1]?.name as StreamingServers, SubOrDub.SUB));
//     console.log(sources, servers);
//     console.log('sources end');
//     if (!search || !search.results) {
//       throw new Error('Invalid response format from API');
//     }
//     return search;
//   } catch (error) {
//     console.log(error);
//     throw new Error('Failed to fetch search');
//   }
// };

// export default function Anime() {
//   const [state, setState] = useState<FetchState>({
//     data: [],
//     isLoading: true,
//     error: '',
//   });
//   const [refreshing, setRefreshing] = useState(false);

//   const loadData = async () => {
//     try {
//       const sources = await fetchData();
//       setState({
//         data: sources.results || [],
//         isLoading: false,
//         error: null,
//       });
//     } catch (error: unknown) {
//       console.log(error);
//       setState((prev) => ({
//         ...prev,
//         isLoading: false,
//         error: error instanceof Error ? error.message : String(error),
//       }));
//     }
//   };

//   const onRefresh = useCallback(() => {
//     setRefreshing(true);
//     loadData().finally(() => setRefreshing(false));
//   }, []);

//   useEffect(() => {
//     loadData();
//   }, []);

//   if (state.error) {
//     return (
//       <View style={styles.container}>
//         <Text style={styles.errorText}>Error: {state.error.toString()}</Text>
//       </View>
//     );
//   }

//   return (
//     <SafeAreaView style={styles.container}>
//       {state.isLoading ? (
//         <ActivityIndicator size="large" color="#0000ff" />
//       ) : (
//         <FlatList
//           data={state.data}
//           renderItem={({ item }) => (
//             <View style={styles.itemContainer}>
//               <Text style={styles.itemText}>{typeof item.title === 'string' ? item.title : String(item.title)}</Text>
//             </View>
//           )}
//           keyExtractor={(item) => item.id.toString()}
//           refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//           ListEmptyComponent={<Text style={styles.emptyText}>No sources found</Text>}
//         />
//       )}
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   itemContainer: {
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#eee',
//   },
//   itemText: {
//     fontSize: 16,
//   },
//   errorText: {
//     color: 'red',
//     textAlign: 'center',
//     margin: 16,
//   },
//   emptyText: {
//     textAlign: 'center',
//     margin: 16,
//     color: '#666',
//   },
// });
