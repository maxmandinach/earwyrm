import Foundation
import Supabase

@Observable
@MainActor
final class CollectionManager {
    var collections: [Collection] = []
    var collectionLyrics: [UUID: [Lyric]] = [:]
    var savedLyricIds: Set<UUID> = []
    var isLoading = false
    var toast: ToastManager?
    private var inFlightCollectionOps: Set<String> = []

    // MARK: - Fetch Collections

    func fetchCollections(userId: UUID) async {
        isLoading = true
        do {
            let result: [Collection] = try await supabase
                .from("collections")
                .select()
                .eq("user_id", value: userId.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value
            collections = result
            await fetchSavedLyricIds(userId: userId)
        } catch {
            print("Fetch collections error: \(error)")
        }
        isLoading = false
    }

    // MARK: - Fetch Lyrics for Collection

    func fetchLyricsForCollection(collectionId: UUID, smartTag: String? = nil) async {
        do {
            if let tag = smartTag {
                // Smart collection: query lyrics containing this tag
                let lyrics: [Lyric] = try await supabase
                    .from("lyrics")
                    .select()
                    .contains("tags", value: [tag])
                    .order("created_at", ascending: false)
                    .execute()
                    .value
                collectionLyrics[collectionId] = lyrics
            } else {
                // Manual collection: query via junction table
                let junctions: [LyricCollection] = try await supabase
                    .from("lyric_collections")
                    .select()
                    .eq("collection_id", value: collectionId.uuidString)
                    .order("added_at", ascending: false)
                    .execute()
                    .value

                guard !junctions.isEmpty else {
                    collectionLyrics[collectionId] = []
                    return
                }

                let lyricIds = junctions.map { $0.lyricId.uuidString }
                let lyrics: [Lyric] = try await supabase
                    .from("lyrics")
                    .select()
                    .in("id", values: lyricIds)
                    .execute()
                    .value

                // Preserve junction ordering
                let lyricMap = Dictionary(uniqueKeysWithValues: lyrics.map { ($0.id, $0) })
                collectionLyrics[collectionId] = junctions.compactMap { lyricMap[$0.lyricId] }
            }
        } catch {
            print("Fetch collection lyrics error: \(error)")
        }
    }

    // MARK: - Create Collection

    @discardableResult
    func createCollection(
        userId: UUID,
        name: String,
        description: String?,
        color: String?,
        isSmart: Bool = false,
        smartTag: String? = nil
    ) async -> Collection? {
        let insert = CollectionInsert(
            userId: userId,
            name: name,
            description: description,
            color: color,
            isSmart: isSmart,
            smartTag: smartTag
        )

        do {
            let created: Collection = try await supabase
                .from("collections")
                .insert(insert)
                .select()
                .single()
                .execute()
                .value
            collections.insert(created, at: 0)
            Haptics.medium()
            return created
        } catch {
            toast?.show("couldn't create collection")
            print("Create collection error: \(error)")
            return nil
        }
    }

    // MARK: - Update Collection

    func updateCollection(id: UUID, name: String, description: String?, color: String?) async {
        do {
            let updated: Collection = try await supabase
                .from("collections")
                .update([
                    "name": name,
                    "description": description ?? "",
                    "color": color ?? "charcoal"
                ])
                .eq("id", value: id.uuidString)
                .select()
                .single()
                .execute()
                .value

            if let idx = collections.firstIndex(where: { $0.id == id }) {
                collections[idx] = updated
            }
        } catch {
            toast?.show("couldn't update collection")
            print("Update collection error: \(error)")
        }
    }

    // MARK: - Delete Collection

    func deleteCollection(id: UUID) async {
        let removed = collections.first { $0.id == id }
        collections.removeAll { $0.id == id }
        collectionLyrics.removeValue(forKey: id)
        Haptics.light()

        do {
            try await supabase
                .from("collections")
                .delete()
                .eq("id", value: id.uuidString)
                .execute()
        } catch {
            if let removed {
                collections.append(removed)
            }
            toast?.show("couldn't delete collection")
            print("Delete collection error: \(error)")
        }
    }

    // MARK: - Add Lyric to Collection

    func addLyricToCollection(lyricId: UUID, collectionId: UUID) async {
        let key = "add-\(lyricId)-\(collectionId)"
        guard !inFlightCollectionOps.contains(key) else { return }
        inFlightCollectionOps.insert(key)
        defer { inFlightCollectionOps.remove(key) }

        // Optimistic update
        savedLyricIds.insert(lyricId)
        Haptics.medium()

        let insert = LyricCollectionInsert(lyricId: lyricId, collectionId: collectionId)
        do {
            try await supabase
                .from("lyric_collections")
                .insert(insert)
                .execute()
        } catch {
            let desc = String(describing: error)
            if desc.contains("23505") {
                // Already exists — fine
                return
            }
            savedLyricIds.remove(lyricId)
            toast?.show("couldn't save to collection")
            print("Add lyric to collection error: \(error)")
        }
    }

    // MARK: - Remove Lyric from Collection

    func removeLyricFromCollection(lyricId: UUID, collectionId: UUID) async {
        let key = "rm-\(lyricId)-\(collectionId)"
        guard !inFlightCollectionOps.contains(key) else { return }
        inFlightCollectionOps.insert(key)
        defer { inFlightCollectionOps.remove(key) }

        // Optimistic update
        collectionLyrics[collectionId]?.removeAll { $0.id == lyricId }
        Haptics.light()

        do {
            try await supabase
                .from("lyric_collections")
                .delete()
                .eq("lyric_id", value: lyricId.uuidString)
                .eq("collection_id", value: collectionId.uuidString)
                .execute()

            // Recompute saved IDs
            await refreshSavedLyricIds()
        } catch {
            toast?.show("couldn't remove from collection")
            print("Remove lyric from collection error: \(error)")
        }
    }

    // MARK: - Saved Lyric IDs

    func fetchSavedLyricIds(userId: UUID) async {
        do {
            let collectionIds = collections.map { $0.id.uuidString }
            guard !collectionIds.isEmpty else {
                savedLyricIds = []
                return
            }

            let junctions: [LyricCollection] = try await supabase
                .from("lyric_collections")
                .select()
                .in("collection_id", values: collectionIds)
                .execute()
                .value

            savedLyricIds = Set(junctions.map { $0.lyricId })
        } catch {
            print("Fetch saved lyric IDs error: \(error)")
        }
    }

    func isLyricSaved(_ lyricId: UUID) -> Bool {
        savedLyricIds.contains(lyricId)
    }

    // MARK: - Collection membership for a specific lyric

    func collectionIdsContaining(lyricId: UUID) async -> Set<UUID> {
        do {
            let junctions: [LyricCollection] = try await supabase
                .from("lyric_collections")
                .select()
                .eq("lyric_id", value: lyricId.uuidString)
                .execute()
                .value
            return Set(junctions.map { $0.collectionId })
        } catch {
            print("Fetch lyric membership error: \(error)")
            return []
        }
    }

    // MARK: - Lyric count for a collection

    func lyricCount(for collectionId: UUID) -> Int {
        collectionLyrics[collectionId]?.count ?? 0
    }

    // MARK: - Private

    private func refreshSavedLyricIds() async {
        let collectionIds = collections.map { $0.id.uuidString }
        guard !collectionIds.isEmpty else {
            savedLyricIds = []
            return
        }
        do {
            let junctions: [LyricCollection] = try await supabase
                .from("lyric_collections")
                .select()
                .in("collection_id", values: collectionIds)
                .execute()
                .value
            savedLyricIds = Set(junctions.map { $0.lyricId })
        } catch {
            print("Refresh saved IDs error: \(error)")
        }
    }
}
