import SwiftUI
import UIKit

struct CreateCollectionSheet: View {
    var existing: Collection? = nil

    @Environment(AuthManager.self) private var auth
    @Environment(CollectionManager.self) private var collectionManager
    @Environment(\.dismiss) private var dismiss

    @State private var name: String = ""
    @State private var descriptionText: String = ""
    @State private var selectedColor: String = "charcoal"
    @State private var isSmart: Bool = false
    @State private var smartTag: String = ""

    private var isEditing: Bool { existing != nil }
    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
            && (!isSmart || !smartTag.trimmingCharacters(in: .whitespaces).isEmpty)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.Spacing.lg) {
                    // Name
                    VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                        Text("Name")
                            .font(Theme.dmSans(13, weight: .medium))
                            .foregroundStyle(Theme.Light.secondary)
                        TextField("e.g. Late Night Vibes", text: $name)
                            .font(Theme.dmSans(15))
                            .padding(Theme.Spacing.sm + 4)
                            .background(Theme.Light.card)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    // Description
                    VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                        Text("Description")
                            .font(Theme.dmSans(13, weight: .medium))
                            .foregroundStyle(Theme.Light.secondary)
                        TextField("Optional description", text: $descriptionText)
                            .font(Theme.dmSans(15))
                            .padding(Theme.Spacing.sm + 4)
                            .background(Theme.Light.card)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    // Color picker
                    VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                        Text("Color")
                            .font(Theme.dmSans(13, weight: .medium))
                            .foregroundStyle(Theme.Light.secondary)

                        HStack(spacing: Theme.Spacing.md) {
                            ForEach(CollectionColors.all, id: \.self) { colorName in
                                Button {
                                    selectedColor = colorName
                                    Haptics.selection()
                                } label: {
                                    Circle()
                                        .fill(CollectionColors.color(for: colorName))
                                        .frame(width: 32, height: 32)
                                        .overlay {
                                            if selectedColor == colorName {
                                                Circle()
                                                    .strokeBorder(.white, lineWidth: 2)
                                                    .frame(width: 26, height: 26)
                                            }
                                        }
                                }
                            }
                        }
                    }

                    // Smart collection toggle (only for new collections)
                    if !isEditing {
                        VStack(alignment: .leading, spacing: Theme.Spacing.sm) {
                            Toggle(isOn: $isSmart) {
                                HStack(spacing: 6) {
                                    Image(systemName: "sparkles")
                                        .font(.system(size: 13))
                                    Text("Smart collection")
                                        .font(Theme.dmSans(14, weight: .medium))
                                }
                                .foregroundStyle(Theme.Light.text)
                            }
                            .tint(Theme.Light.accent)

                            if isSmart {
                                VStack(alignment: .leading, spacing: Theme.Spacing.xs) {
                                    Text("Tag filter")
                                        .font(Theme.dmSans(13, weight: .medium))
                                        .foregroundStyle(Theme.Light.secondary)
                                    TextField("e.g. melancholy", text: $smartTag)
                                        .font(Theme.dmSans(15))
                                        .padding(Theme.Spacing.sm + 4)
                                        .background(Theme.Light.card)
                                        .clipShape(RoundedRectangle(cornerRadius: 10))
                                    Text("Lyrics with this tag will auto-populate.")
                                        .font(Theme.dmSans(12))
                                        .foregroundStyle(Theme.Light.muted)
                                }
                                .transition(.opacity.combined(with: .move(edge: .top)))
                            }
                        }
                        .animation(.easeInOut(duration: 0.2), value: isSmart)
                    }
                }
                .padding(Theme.Spacing.lg)
            }
            .background(Theme.Light.background)
            .navigationTitle(isEditing ? "Edit Collection" : "New Collection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") {
                        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
                    }
                    .font(Theme.dmSans(15, weight: .medium))
                    .foregroundStyle(Theme.Light.accent)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .font(Theme.dmSans(15))
                        .foregroundStyle(Theme.Light.secondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isEditing ? "Save" : "Create") {
                        Task { await save() }
                    }
                    .font(Theme.dmSans(15, weight: .medium))
                    .foregroundStyle(canSave ? Theme.Light.accent : Theme.Light.muted)
                    .disabled(!canSave)
                }
            }
        }
        .onAppear {
            if let existing {
                name = existing.name
                descriptionText = existing.description ?? ""
                selectedColor = existing.color ?? "charcoal"
                isSmart = existing.isSmart ?? false
                smartTag = existing.smartTag ?? ""
            }
        }
    }

    private func save() async {
        guard let userId = auth.userId else { return }
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        let trimmedDesc = descriptionText.trimmingCharacters(in: .whitespaces)
        let desc: String? = trimmedDesc.isEmpty ? nil : trimmedDesc

        if let existing {
            await collectionManager.updateCollection(
                id: existing.id,
                name: trimmedName,
                description: desc,
                color: selectedColor
            )
        } else {
            let trimmedTag = smartTag.trimmingCharacters(in: .whitespaces)
            await collectionManager.createCollection(
                userId: userId,
                name: trimmedName,
                description: desc,
                color: selectedColor,
                isSmart: isSmart,
                smartTag: isSmart ? trimmedTag : nil
            )
        }
        Haptics.success()
        dismiss()
    }
}
