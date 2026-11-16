import type { ReactElement } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import type { SearchState } from '../hooks/useSearch';
import { GAP, PAD } from '../theme';
import { SearchBox } from './SearchBox';
import { ErrorView, IdleView, LoadingView } from './StateViews';

type Props<T> = {
  search: SearchState<T>;
  /** The provider's name, for the placeholder and messages */
  label: string;
  idleEmoji: string;
  idleHint: string;
  columns: number;
  keyOf: (item: T) => string;
  renderItem: (item: T) => ReactElement;
};

/** The search bar, then the results grid, or what the search is doing instead. */
export function SearchResults<T>({ search, label, idleEmoji, idleHint, columns, keyOf, renderItem }: Props<T>) {
  return (
    <>
      <View style={S.searchWrap}>
        <SearchBox
          value={search.query}
          onChangeText={search.setQuery}
          onSubmit={search.submit}
          placeholder={`Search on ${label}…`}
        />
      </View>
      {search.searching ? (
        <LoadingView text={`Searching ${label}…`} />
      ) : search.idle ? (
        <IdleView emoji={idleEmoji} title="Find something to watch" hint={idleHint} />
      ) : search.error ? (
        <ErrorView message={search.error} onRetry={search.retry} retryLabel="Try again" />
      ) : (
        <FlatList
          data={search.results}
          keyExtractor={keyOf}
          numColumns={columns}
          renderItem={({ item }) => renderItem(item)}
          columnWrapperStyle={S.row}
          contentContainerStyle={S.grid}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );
}

const S = StyleSheet.create({
  searchWrap: { paddingHorizontal: PAD, paddingBottom: 14 },
  grid: { paddingHorizontal: PAD, paddingBottom: 30, gap: GAP },
  row: { gap: GAP },
});
