/**
 * News Detail Screen
 *
 * Full article view.
 */

import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Share,
  Pressable,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Spacing, FontSize, BorderRadius } from "@/constants";
import { Loading, ErrorView } from "@/components";
import {
  getArticleById,
  incrementViewCount,
  getImageUrl,
} from "@/services/news.service";
import {
  formatBSDate,
  adToBS,
  toNepaliDigits,
  formatDualDate,
  type DualDate,
} from "@/lib";
import type { Article } from "@/types";

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const { width } = useWindowDimensions();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<Article | null>(null);

  const loadArticle = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getArticleById(id);
      if (!data) {
        setError("समाचार फेला परेन।");
        return;
      }

      setArticle(data);

      // Increment view count
      incrementViewCount(id);
    } catch (err) {
      console.error("Failed to load article:", err);
      setError("समाचार लोड गर्न सकिएन।");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  const handleShare = async () => {
    if (!article) return;

    try {
      await Share.share({
        message: `${article.title}\n\nहाम्रो नेपालमा पढ्नुहोस्`,
        title: article.title,
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error || !article) {
    return (
      <ErrorView message={error || "समाचार फेला परेन।"} onRetry={loadArticle} />
    );
  }

  const imageUrl = article.featuredImage
    ? getImageUrl(article.featuredImage, 800, 450)
    : null;

  const dates: DualDate = article.publishedAt
    ? formatDualDate(article.publishedAt)
    : formatDualDate(article.$createdAt);

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "समाचार",
          headerRight: () => (
            <Pressable onPress={handleShare} style={styles.shareButton}>
              <Ionicons name="share-outline" size={24} color="#ffffff" />
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured image */}
        {imageUrl && (
          <Image
            source={{ uri: imageUrl }}
            style={[styles.image, { width }]}
            contentFit="cover"
            transition={300}
          />
        )}

        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          {/* Breaking badge */}
          {article.isBreaking && (
            <View
              style={[
                styles.breakingBadge,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.breakingText}>ब्रेकिङ न्युज</Text>
            </View>
          )}

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {article.title}
          </Text>

          {/* Meta info */}
          <View style={[styles.meta, { borderBottomColor: colors.border }]}>
            <View style={styles.metaItem}>
              <Ionicons
                name="person-outline"
                size={16}
                color={colors.textMuted}
              />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {article.authorName}
              </Text>
            </View>
            <View style={styles.dateContainer}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={colors.textMuted}
              />
              <View style={styles.dateTexts}>
                <Text style={[styles.bsDate, { color: colors.text }]}>
                  {dates.bs}
                </Text>
                <Text style={[styles.adDate, { color: colors.textMuted }]}>
                  {dates.ad}
                </Text>
              </View>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="eye-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                {toNepaliDigits(article.viewCount)} पटक हेरियो
              </Text>
            </View>
          </View>

          {/* Excerpt */}
          {article.excerpt && (
            <Text style={[styles.excerpt, { color: colors.textSecondary }]}>
              {article.excerpt}
            </Text>
          )}

          {/* Content */}
          <Text style={[styles.body, { color: colors.text }]}>
            {article.content}
          </Text>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <View style={styles.tags}>
              {article.tags.map((tag, index) => (
                <View
                  key={index}
                  style={[styles.tag, { backgroundColor: colors.background }]}
                >
                  <Text
                    style={[styles.tagText, { color: colors.textSecondary }]}
                  >
                    #{tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpace} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  shareButton: {
    padding: Spacing.sm,
  },
  image: {
    height: 250,
  },
  content: {
    padding: Spacing.lg,
    marginTop: -Spacing.lg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  breakingBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  breakingText: {
    color: "#ffffff",
    fontSize: FontSize.sm,
    fontWeight: "bold",
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: "bold",
    lineHeight: FontSize.xxl * 1.4,
    marginBottom: Spacing.md,
  },
  meta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    marginBottom: Spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.sm,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.xs,
  },
  dateTexts: {
    flexDirection: "column",
  },
  bsDate: {
    fontSize: FontSize.sm,
    fontWeight: "600",
  },
  adDate: {
    fontSize: FontSize.xs,
  },
  excerpt: {
    fontSize: FontSize.lg,
    fontStyle: "italic",
    lineHeight: FontSize.lg * 1.6,
    marginBottom: Spacing.lg,
  },
  body: {
    fontSize: FontSize.md,
    lineHeight: FontSize.md * 1.8,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
  tag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  tagText: {
    fontSize: FontSize.sm,
  },
  bottomSpace: {
    height: Spacing.xxl,
  },
});
