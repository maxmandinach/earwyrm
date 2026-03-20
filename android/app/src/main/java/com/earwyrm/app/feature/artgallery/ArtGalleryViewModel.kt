package com.earwyrm.app.feature.artgallery

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.earwyrm.app.core.model.Lyric
import com.earwyrm.app.core.network.ArtVariant
import com.earwyrm.app.core.network.CardArtService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class CardStyle {
    NONE,
    AI_VARIANT
}

data class ArtGalleryState(
    val variants: List<ArtVariant> = emptyList(),
    val selectedStyle: CardStyle = CardStyle.NONE,
    val selectedVariantIndex: Int = -1,
    val isGenerating: Boolean = false,
    val error: String? = null,
    val artRemaining: Int? = null,
    val needsUpgrade: Boolean = false,
    val wasFreeTierGen: Boolean = false
)

@HiltViewModel
class ArtGalleryViewModel @Inject constructor(
    private val cardArtService: CardArtService
) : ViewModel() {

    private val _state = MutableStateFlow(ArtGalleryState())
    val state: StateFlow<ArtGalleryState> = _state.asStateFlow()

    val hasAIArt: Boolean get() = _state.value.variants.isNotEmpty()

    val activeVariantUrl: String?
        get() {
            val s = _state.value
            return if (s.selectedStyle == CardStyle.AI_VARIANT && s.selectedVariantIndex in s.variants.indices) {
                s.variants[s.selectedVariantIndex].imageUrl
            } else null
        }

    fun loadVariants(lyric: Lyric) {
        viewModelScope.launch {
            val variants = cardArtService.fetchVariants(lyric.id)
            val selectedIndex: Int
            val selectedStyle: CardStyle

            if (lyric.cardArtUrl != null) {
                val aiIndex = variants.indexOfFirst { it.imageUrl == lyric.cardArtUrl }
                if (aiIndex >= 0) {
                    selectedIndex = aiIndex
                    selectedStyle = CardStyle.AI_VARIANT
                } else if (variants.isNotEmpty()) {
                    selectedIndex = 0
                    selectedStyle = CardStyle.AI_VARIANT
                } else {
                    selectedIndex = -1
                    selectedStyle = CardStyle.NONE
                }
            } else {
                selectedIndex = -1
                selectedStyle = CardStyle.NONE
            }

            _state.value = _state.value.copy(
                variants = variants,
                selectedStyle = selectedStyle,
                selectedVariantIndex = selectedIndex
            )
        }
    }

    fun selectVariant(index: Int) {
        _state.value = _state.value.copy(
            selectedStyle = CardStyle.AI_VARIANT,
            selectedVariantIndex = index
        )
    }

    fun selectNone() {
        _state.value = _state.value.copy(
            selectedStyle = CardStyle.NONE,
            selectedVariantIndex = -1
        )
    }

    fun generate(lyric: Lyric, note: String? = null, refinement: String? = null) {
        viewModelScope.launch {
            _state.value = _state.value.copy(
                isGenerating = true,
                error = null,
                needsUpgrade = false
            )

            when (val result = cardArtService.generateArt(lyric, note, refinement)) {
                is CardArtService.GenerateResult.Success -> {
                    // Refetch variants to get the new one
                    val updatedVariants = cardArtService.fetchVariants(lyric.id)
                    _state.value = _state.value.copy(
                        variants = updatedVariants,
                        selectedStyle = CardStyle.AI_VARIANT,
                        selectedVariantIndex = 0,
                        isGenerating = false,
                        artRemaining = result.remaining,
                        wasFreeTierGen = result.isFreeTier
                    )
                }
                is CardArtService.GenerateResult.UpgradeRequired -> {
                    _state.value = _state.value.copy(
                        isGenerating = false,
                        needsUpgrade = true
                    )
                }
                is CardArtService.GenerateResult.Error -> {
                    _state.value = _state.value.copy(
                        isGenerating = false,
                        error = result.message
                    )
                }
            }
        }
    }

    fun persistSelection(lyricId: String) {
        viewModelScope.launch {
            val s = _state.value
            if (s.selectedStyle == CardStyle.NONE) {
                cardArtService.clearActiveVariant(lyricId)
            } else if (s.selectedStyle == CardStyle.AI_VARIANT && s.selectedVariantIndex in s.variants.indices) {
                cardArtService.setActiveVariant(lyricId, s.variants[s.selectedVariantIndex].imageUrl)
            }
        }
    }

    fun clearUpgradeFlag() {
        _state.value = _state.value.copy(needsUpgrade = false)
    }

    fun resolveAction(isPlus: Boolean, freeGenExhausted: Boolean): ArtAction {
        if (!isPlus && (freeGenExhausted || _state.value.wasFreeTierGen || hasAIArt)) {
            return ArtAction.SHOW_PAYWALL
        }
        return ArtAction.SHOW_GEN_SHEET
    }

    enum class ArtAction {
        SHOW_GEN_SHEET,
        SHOW_PAYWALL
    }
}
