/**
 * Home Screen
 *
 * Main news feed with featured articles and categories.
 */

import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useColorScheme,
} from "react-native";
import { Colors, Spacing, FontSize } from "@/constants";
import {
  NewsCard,
  CategoryChip,
  Loading,
  ErrorView,
  EmptyState,
} from "@/components";
import {
  getArticles,
  getFeaturedArticles,
  getBreakingNews,
} from "@/services/news.service";
import { getCategories } from "@/services/categories.service";
import { getCurrentBSDateString } from "@/lib";
import type { Article, Category } from "@/types";

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [breakingNews, setBreakingNews] = useState<Article[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setError(null);

      try {
        const [featuredData, breakingData, articlesData, categoriesData] =
          await Promise.all([
            getFeaturedArticles(5),
            getBreakingNews(5),
            getArticles(20, 0, selectedCategory || undefined),
            getCategories(),
          ]);

        setFeaturedArticles(featuredData);
        setBreakingNews(breakingData);
        setArticles(articlesData.documents);
        setCategories(categoriesData);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError("डाटा लोड गर्न सकिएन।");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedCategory]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  const handleCategorySelect = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => loadData()} />;
  }

  const renderHeader = () => (
    <View>
      {/* Date header */}
      <View style={[styles.dateHeader, { backgroundColor: colors.surface }]}>
        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
          {getCurrentBSDateString()}
        </Text>
      </View>

      {/* Breaking news ticker */}
      {breakingNews.length > 0 && (
        <View
          style={[styles.breakingSection, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.breakingLabel}>ब्रेकिङ:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {breakingNews.map((article) => (
              <Text key={article.$id} style={styles.breakingItem}>
                {article.title}
              </Text>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Featured articles */}
      {featuredArticles.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            मुख्य समाचार
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
          >
            {featuredArticles.map((article) => (
              <View key={article.$id} style={styles.featuredItem}>
                <NewsCard article={article} variant="featured" />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Category filter */}
      <View style={styles.section}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          <CategoryChip
            category={
              {
                $id: "all",
                name: "सबै",
                slug: "all",
                sortOrder: 0,
                isActive: true,
              } as Category
            }
            isSelected={selectedCategory === null}
            onPress={() => handleCategorySelect(null)}
          />
          {categories.map((category) => (
            <CategoryChip
              key={category.$id}
              category={category}
              isSelected={selectedCategory === category.$id}
              onPress={() => handleCategorySelect(category.$id)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Latest news header */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          ताजा समाचार
        </Text>
      </View>
    </View>
  );

  return (
    <FlatList
      data={articles}
      keyExtractor={(item) => item.$id}
      renderItem={({ item }) => (
        <View style={styles.articleItem}>
          <NewsCard article={item} />
        </View>
      )}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={<EmptyState />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: Spacing.xl,
  },
  dateHeader: {
    padding: Spacing.md,
    alignItems: "center",
  },
  dateText: {
    fontSize: FontSize.sm,
  },
  breakingSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  breakingLabel: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: FontSize.sm,
    marginRight: Spacing.sm,
  },
  breakingItem: {
    color: "#ffffff",
    fontSize: FontSize.sm,
    marginRight: Spacing.xl,
  },
  section: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: "bold",
    marginBottom: Spacing.sm,
  },
  featuredScroll: {
    paddingRight: Spacing.md,
  },
  featuredItem: {
    width: 300,
    marginRight: Spacing.md,
  },
  categoryScroll: {
    paddingVertical: Spacing.sm,
  },
  articleItem: {
    paddingHorizontal: Spacing.md,
  },
});
