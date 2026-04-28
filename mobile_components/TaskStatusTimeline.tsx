import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { formatDistanceToNow, format } from 'date-fns';

/**
 * Premium Status Timeline Component for React Native
 * 
 * Features:
 * - Vertical timeline with dynamic line
 * - Card-based design with status badges
 * - Smooth scroll & tap animations
 * - Professional layout optimized for small screens
 */

interface StatusHistoryItem {
  id: string;
  changedByName: string;
  changedByAvatar?: string;
  fromStatus: { name: string; color: string } | null;
  toStatus: { name: string; color: string };
  changedAt: string;
}

interface Props {
  history: StatusHistoryItem[];
  isLoading?: boolean;
}

export const TaskStatusTimeline: React.FC<Props> = ({ history, isLoading }) => {
  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0D6EFD" />
        <Text style={styles.loadingText}>Loading timeline...</Text>
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>⏳</Text>
        </View>
        <Text style={styles.emptyTitle}>No status changes yet</Text>
        <Text style={styles.emptySubtitle}>Updates will appear here as the task progresses.</Text>
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: StatusHistoryItem; index: number }) => {
    const isFirst = index === 0;
    const isLast = index === history.length - 1;

    return (
      <View style={styles.itemWrapper}>
        {/* Timeline Line Section */}
        <View style={styles.timelineColumn}>
          <View style={[styles.line, isFirst && styles.lineFirst, isLast && styles.lineLast]} />
          <View style={[styles.dot, isFirst && styles.dotActive]} />
        </View>

        {/* Content Card Section */}
        <TouchableOpacity activeOpacity={0.7} style={styles.card}>
          <View style={styles.cardHeader}>
            <Image 
              source={item.changedByAvatar ? { uri: item.changedByAvatar } : require('./assets/default-avatar.png')} 
              style={styles.avatar} 
            />
            <View style={styles.headerText}>
              <Text style={styles.userName}>{item.changedByName}</Text>
              <Text style={styles.timeAgo}>
                {formatDistanceToNow(new Date(item.changedAt), { addSuffix: true })}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            {item.fromStatus ? (
              <View style={[styles.badge, { backgroundColor: `${item.fromStatus.color}15`, borderColor: `${item.fromStatus.color}40` }]}>
                <Text style={[styles.badgeText, { color: item.fromStatus.color }]}>
                  {item.fromStatus.name.toUpperCase()}
                </Text>
              </View>
            ) : (
              <Text style={styles.initialText}>INITIAL CREATION</Text>
            )}

            <Text style={styles.arrow}>→</Text>

            <View style={[styles.badgeSolid, { backgroundColor: item.toStatus.color }]}>
              <Text style={styles.badgeTextSolid}>
                {item.toStatus.name.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.fullDate}>
            {format(new Date(item.changedAt), "MMM d, yyyy 'at' h:mm a")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <FlatList
      data={history}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  itemWrapper: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineColumn: {
    width: 30,
    alignItems: 'center',
  },
  line: {
    position: 'absolute',
    width: 2,
    backgroundColor: '#E9ECEF',
    top: 0,
    bottom: 0,
  },
  lineFirst: {
    top: 20,
  },
  lineLast: {
    bottom: '100%',
    height: 20,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DEE2E6',
    borderWidth: 2,
    borderColor: '#FFF',
    marginTop: 20,
    zIndex: 1,
  },
  dotActive: {
    backgroundColor: '#0D6EFD',
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F3F5',
  },
  headerText: {
    marginLeft: 10,
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212529',
  },
  timeAgo: {
    fontSize: 11,
    color: '#868E96',
    marginTop: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeSolid: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  badgeTextSolid: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
  },
  arrow: {
    marginHorizontal: 8,
    fontSize: 14,
    color: '#ADB5BD',
  },
  initialText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#868E96',
    fontStyle: 'italic',
  },
  fullDate: {
    fontSize: 10,
    color: '#ADB5BD',
    marginTop: 10,
    textAlign: 'right',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#868E96',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: {
    fontSize: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#495057',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#868E96',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});
