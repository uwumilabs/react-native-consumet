import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, GAP, PAD, R } from '../theme';

/** The width of a poster in a grid of `columns` across the window. */
export const posterWidth = (columns: number) =>
  (Dimensions.get('window').width - PAD * 2 - GAP * (columns - 1)) / columns;

type Props = {
  title: string;
  image?: string;
  width: number;
  /** Top-right corner: an anime's format, or a movie's rating */
  badge?: string;
  badgeTone?: 'accent' | 'rating';
  /** Under the title, e.g. "Movie · 2024" */
  meta?: string;
  onPress: () => void;
};

export function PosterCard({ title, image, width, badge, badgeTone = 'accent', meta, onPress }: Props) {
  const rating = badgeTone === 'rating';
  return (
    <TouchableOpacity onPress={onPress} style={[S.card, { width, height: width * 1.5 }]} activeOpacity={0.75}>
      {image ? (
        <Image source={{ uri: image }} style={S.image} resizeMode="cover" />
      ) : (
        <View style={[S.image, S.placeholder]} />
      )}
      <View style={S.overlay}>
        <Text style={S.title} numberOfLines={2}>
          {title}
        </Text>
        {meta ? <Text style={S.meta}>{meta}</Text> : null}
      </View>
      {badge ? (
        <View style={[S.badge, rating && S.badgeRating]}>
          <Text style={[S.badgeText, rating && S.badgeTextRating]}>{badge}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const S = StyleSheet.create({
  card: { borderRadius: R.md, overflow: 'hidden', backgroundColor: colors.card },
  image: { ...StyleSheet.absoluteFill },
  placeholder: { backgroundColor: colors.cardAlt },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  title: { fontSize: 11, fontWeight: '600', color: colors.text, lineHeight: 15 },
  meta: { fontSize: 10, color: colors.muted, marginTop: 3 },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.accentFaded,
    borderRadius: R.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  badgeRating: { backgroundColor: 'rgba(0,0,0,0.7)', borderColor: colors.warn },
  badgeText: { fontSize: 9, fontWeight: '700', color: colors.accentLight, letterSpacing: 0.4 },
  badgeTextRating: { color: colors.warn },
});
