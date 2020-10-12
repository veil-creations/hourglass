//=============================================================================
// VividXP_WordWrap.js
//=============================================================================

/*:
 * @plugindesc "Show Text" Word Wrapping
 * @author Lene
 *
 * @help Using this plugin is easy! Just enter your dialog in the message window
 * and watch is wrap around. May not work for all languages.
 * This plugin does not provide plugin commands.
 *
 * @param Word Wrap Style
 * @desc break-all to wrap at any character, break-word to wrap at word start. Default: break-word
 * @default break-word
 */

var VividXP = VividXP || {};
VividXP.WordWrap = {};
VividXP.WordWrap.Parameters = PluginManager.parameters('VividXP_WordWrap');
VividXP.WordWrap.WordWrapStyle = String(
    VividXP.WordWrap.Parameters['Word Wrap Style']
);

(() => {

   var _Window_Base_processCharacter = Window_Base.prototype.processCharacter;
   var _Window_Base_processDrawIcon = Window_Base.prototype.processDrawIcon;
   var _Window_Message_initMembers = Window_Message.prototype.initMembers;
   var _Window_Base_processNewLine  = Window_Base.prototype.processNewLine;

   Window_Message.prototype.initMembers = function() {
       this._processWordWrapBreak = false;
       _Window_Message_initMembers.call(this);
   };

   Window_Message.prototype.updateMessage = function() {
    const textState = this._textState;
    if (textState && !this._processWordWrapBreak) {
        while (!this.isEndOfText(textState)) {
            if (this.needsNewPage(textState)) {
                this.newPage(textState);
            }
            this.updateShowFast();
            this.processCharacter(textState);
            if (this.shouldBreakHere(textState)) {
                break;
            }
        }
        this.flushTextState(textState);
        if (this.isEndOfText(textState) && !this.pause) {
            this.onEndOfText();
        }
        return true;
    } else {
        return false;
    }
};


   /***
    * getWordBoundaries
    * Takes the current message and does regex processing to retrieve the index
    * of the beginning of all words. Since this is javascript, unfortunately
    * the unicode support is lacking. But it should work with english
    * characters and some accented characters as well.
    * textStateText = the full message
    * returns array of indices representing the start of each word in the
    * full message
    */
   Window_Message.prototype.getWordBoundaries = function(textStateText) {
       var result = [];
       var wordRegex = /\b[\S]+\b\S*/gm;
       var wordBoundaryArr = [];
       while ((wordBoundaryArr = wordRegex.exec(textStateText)) !== null) {
           result.push(wordBoundaryArr);
       }
       result = result.map(function(match) {
           return match.index;
       });
       return result;
   };

   /***
    * startMessage
    * Overwrites Window_Message.prototype.startMessage to call getWordBoundaries
    * after escaping the text and before displaying the message
    */
   Window_Message.prototype.startMessage = function() {
    if ( this._processWordWrapBreak === false ){
        const text = $gameMessage.allText();
        this._textState = this.createTextState(text, 0, 0, 0);
        //    this._textState.index = 0;
        //    this._textState.text = this.convertEscapeCharacters($gameMessage.allText());
        this._textState.wordBoundaries = this.getWordBoundaries(this._textState.text);
       }
       
       this.newPage(this._textState);
       this._processWordWrapBreak = false;
       this.updatePlacement();
       this.updateBackground();
       this.open();
       this._nameBoxWindow.start();
   };

   Window_Message.prototype.newPage = function(textState) {
       this.contents.clear();
       if (!this._processWordWrapBreak) {
           this.resetFontSettings();
       }
       this.clearFlags();
       this.loadMessageFace();
       textState.x = this.newLineX(textState);
       textState.y = 0;
       textState.left = this.newLineX(textState);
       textState.height = this.calcTextHeight(textState, false);
   };

   /***
    * processNormalCharacter
    * Check if word wrapping needs to take place
    * textState - contains information related to the message
    */

   Window_Message.prototype.processCharacter = function(textState) {
    const c = textState.text[textState.index++];
    if (c.charCodeAt(0) < 0x20) {
        this.flushTextState(textState);
        this.processControlCharacter(textState, c);
    } else {
        this.processOverflow(textState);
        if (!this.needsNewPage(textState)){
            textState.buffer += c;
        }
    }
};

   /***
    * processDrawIcon
    * Check if word wrapping for icons needs to take place. Since icons are 
    * images we don't need to check the WordWrapStyle setting, we just move 
    * the icon to the next line if it doesn't fit
    * iconIndex - index corresponding to icon to be displayed
    * textState - contains information related to the message
    */
   Window_Message.prototype.processDrawIcon = function(iconIndex, textState) {
       var maxWindowWidth = this.contents.width;
       var iconWidth = Window_Base._iconWidth + 4;
       if ( textState.x >= maxWindowWidth || textState.x + iconWidth >= maxWindowWidth  ) {
           this.wrapToNewLine(textState);
       }
       _Window_Base_processDrawIcon.call(this, iconIndex, textState);
   };

   /***
    * processNewLine
    * Overrides Window_Base.prototype.processNewLine 
    * We have to make sure to check if a new line has pushed content off the page,
    * in the case of a message that has a mixture of manual line breaks and 
    * word wrap.
    * textState - contains information related to the message
    */
   Window_Base.prototype.processNewLine = function(textState) {
       _Window_Base_processNewLine.call(this, textState);
       if (typeof this.needsNewPage === 'function' && this.needsNewPage(textState)) {
          this._processWordWrapBreak = true;
      }
   };

   /***
    * processOverflow
    * Used only for processing normal characters. Check if word wrapping needs
    * to occur and does it. Depending on WordWrapStyle setting, we either wrap
    * the whole word to a new line, or the current character to a new line
    * textState - contains information related to the message
    */
   Window_Message.prototype.processOverflow = function(textState) {
       var maxWindowWidth = this.contents.width;
       var w;
       switch (VividXP.WordWrap.WordWrapStyle) {
           case 'break-word':
               var lastBoundaryIndex = textState.wordBoundaries[textState.wordBoundaries.length - 1];
               var boundaryStartIndex = textState.wordBoundaries.lastIndexOf(textState.index);
               if (boundaryStartIndex !== -1) {
                   var boundaryEndIndex;
                   if ( textState.wordBoundaries[boundaryStartIndex] === lastBoundaryIndex ){
                       boundaryEndIndex = textState.text.length - 1;
                   } else {
                       boundaryEndIndex = textState.wordBoundaries[boundaryStartIndex + 1] - 1;
                   }
                   boundaryStartIndex = textState.wordBoundaries[boundaryStartIndex];
                   var word = textState.text.substring(boundaryStartIndex, boundaryEndIndex);
                   w = this.textWidth(word);
                   if ( textState.x >= maxWindowWidth || textState.x + w >= maxWindowWidth ){
                       this.wrapToNewLine(textState);
                   }
               }

               break;
           case 'break-all':
           default:
               var c = textState.text[textState.index];
               w = this.textWidth(c);
               if ( textState.x >= maxWindowWidth || textState.x + (w * 2) >= maxWindowWidth ){
                   this.wrapToNewLine(textState);
               }
               break;
       }
   };

   /***
    * wrapToNewLine
    * Wraps content to new line. If doing so pushes the rest of the message off
    * current page, then we pause and wait for user input to continue displaying
    * the message
    * textState - contains information related to the message
    */
   Window_Message.prototype.wrapToNewLine = function(textState) {
       this._lineShowFast = false;
       textState.x = this.newLineX(textState);
       textState.y += textState.height;
       textState.height = this.calcTextHeight(textState, false);
        if (this.needsNewPage(textState)) {
           this._processWordWrapBreak = true;
           this.startPause();
       }
   };

})();