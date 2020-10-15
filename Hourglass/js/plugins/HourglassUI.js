//=============================================================================
// RPG Maker MZ - Hourglass UI
//=============================================================================

/*:
 * @target MZ
 * @plugindesc Customizations for UI components.
 * @author Vikanda O'Brien
 *
 * @help HourglassUI.js
 *
 * This plugin customizes common UI components, such as colors, typography,
 * menu, and dialog windows.
 *
 * It does not provide plugin commands.
 */

(() => {
    Window_Base.prototype.updateBackOpacity = function() {
        this.backOpacity = 255;
    };
})();
