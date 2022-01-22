"use strict";
exports.__esModule = true;
exports.rank = void 0;
function prepareBeginningIndexes(target) {
    var targetLen = target.length;
    var beginningIndexes = [];
    var beginningIndexesLen = 0;
    var wasUpper = false;
    var wasAlphanum = false;
    for (var i = 0; i < targetLen; ++i) {
        var targetCode = target.charCodeAt(i);
        var isUpper = targetCode >= 65 && targetCode <= 90;
        var isAlphanum = isUpper || targetCode >= 97 && targetCode <= 122 || targetCode >= 48 && targetCode <= 57;
        var isBeginning = isUpper && !wasUpper || !wasAlphanum || !isAlphanum;
        wasUpper = isUpper;
        wasAlphanum = isAlphanum;
        if (isBeginning)
            beginningIndexes[beginningIndexesLen++] = i;
    }
    return beginningIndexes;
}
function prepareNextBeginningIndexes(target) {
    var targetLen = target.length;
    var beginningIndexes = prepareBeginningIndexes(target);
    var nextBeginningIndexes = []; // new Array(targetLen)     sparse array is too slow
    var lastIsBeginning = beginningIndexes[0];
    var lastIsBeginningI = 0;
    for (var i = 0; i < targetLen; ++i) {
        if (lastIsBeginning > i) {
            nextBeginningIndexes[i] = lastIsBeginning;
        }
        else {
            lastIsBeginning = beginningIndexes[++lastIsBeginningI];
            nextBeginningIndexes[i] = lastIsBeginning === undefined ? targetLen : lastIsBeginning;
        }
    }
    return nextBeginningIndexes;
}
function rank(searchLowerCodes, prepared, searchLowerCode, matchesSimple, matchesStrict) {
    console.log('algorithm', searchLowerCode, prepared, searchLowerCode);
    var targetLowerCodes = prepared._targetLowerCodes;
    var searchLen = searchLowerCodes.length;
    var targetLen = targetLowerCodes.length;
    var searchI = 0; // where we at
    var targetI = 0; // where you at
    var typoSimpleI = 0;
    var matchesSimpleLen = 0;
    // very basic fuzzy match; to remove non-matching targets ASAP!
    // walk through target. find sequential matches.
    // if all chars aren't found then exit
    for (;;) {
        var isMatch = searchLowerCode === targetLowerCodes[targetI];
        if (isMatch) {
            matchesSimple[matchesSimpleLen++] = targetI;
            ++searchI;
            if (searchI === searchLen)
                break;
            searchLowerCode = searchLowerCodes[typoSimpleI === 0 ? searchI : (typoSimpleI === searchI ? searchI + 1 : (typoSimpleI === searchI - 1 ? searchI - 1 : searchI))];
        }
        ++targetI;
        if (targetI >= targetLen) { // Failed to find searchI
            // Check for typo or exit
            // we go as far as possible before trying to transpose
            // then we transpose backwards until we reach the beginning
            for (;;) {
                if (searchI <= 1)
                    return null; // not allowed to transpose first char
                if (typoSimpleI === 0) { // we haven't tried to transpose yet
                    --searchI;
                    var searchLowerCodeNew = searchLowerCodes[searchI];
                    if (searchLowerCode === searchLowerCodeNew)
                        continue; // doesn't make sense to transpose a repeat char
                    typoSimpleI = searchI;
                }
                else {
                    if (typoSimpleI === 1)
                        return null; // reached the end of the line for transposing
                    --typoSimpleI;
                    searchI = typoSimpleI;
                    searchLowerCode = searchLowerCodes[searchI + 1];
                    var searchLowerCodeNew = searchLowerCodes[searchI];
                    if (searchLowerCode === searchLowerCodeNew)
                        continue; // doesn't make sense to transpose a repeat char
                }
                matchesSimpleLen = searchI;
                targetI = matchesSimple[matchesSimpleLen - 1] + 1;
                break;
            }
        }
    }
    var searchI = 0;
    var typoStrictI = 0;
    var successStrict = false;
    var matchesStrictLen = 0;
    var nextBeginningIndexes = prepared._nextBeginningIndexes;
    if (nextBeginningIndexes === null)
        nextBeginningIndexes = prepared._nextBeginningIndexes = prepareNextBeginningIndexes(prepared.target);
    var firstPossibleI = targetI = matchesSimple[0] === 0 ? 0 : nextBeginningIndexes[matchesSimple[0] - 1];
    // Our target string successfully matched all characters in sequence!
    // Let's try a more advanced and strict test to improve the score
    // only count it as a match if it's consecutive or a beginning character!
    if (targetI !== targetLen)
        for (;;) {
            if (targetI >= targetLen) {
                // We failed to find a good spot for this search char, go back to the previous search char and force it forward
                if (searchI <= 0) { // We failed to push chars forward for a better match
                    // transpose, starting from the beginning
                    ++typoStrictI;
                    if (typoStrictI > searchLen - 2)
                        break;
                    if (searchLowerCodes[typoStrictI] === searchLowerCodes[typoStrictI + 1])
                        continue; // doesn't make sense to transpose a repeat char
                    targetI = firstPossibleI;
                    continue;
                }
                --searchI;
                var lastMatch = matchesStrict[--matchesStrictLen];
                targetI = nextBeginningIndexes[lastMatch];
            }
            else {
                var isMatch = searchLowerCodes[typoStrictI === 0 ? searchI : (typoStrictI === searchI ? searchI + 1 : (typoStrictI === searchI - 1 ? searchI - 1 : searchI))] === targetLowerCodes[targetI];
                if (isMatch) {
                    matchesStrict[matchesStrictLen++] = targetI;
                    ++searchI;
                    if (searchI === searchLen) {
                        successStrict = true;
                        break;
                    }
                    ++targetI;
                }
                else {
                    targetI = nextBeginningIndexes[targetI];
                }
            }
        }
    { // tally up the score & keep track of matches for highlighting later
        if (successStrict) {
            var matchesBest = matchesStrict;
            var matchesBestLen = matchesStrictLen;
        }
        else {
            var matchesBest = matchesSimple;
            var matchesBestLen = matchesSimpleLen;
        }
        var score = 0;
        var lastTargetI = -1;
        for (var i = 0; i < searchLen; ++i) {
            var targetI = matchesBest[i];
            // score only goes down if they're not consecutive
            if (lastTargetI !== targetI - 1)
                score -= targetI;
            lastTargetI = targetI;
        }
        if (!successStrict) {
            score *= 1000;
            if (typoSimpleI !== 0)
                score += -20; /*typoPenalty*/
        }
        else {
            if (typoStrictI !== 0)
                score += -20; /*typoPenalty*/
        }
        score -= targetLen - searchLen;
        prepared.score = score;
        prepared.indexes = new Array(matchesBestLen);
        for (var i = matchesBestLen - 1; i >= 0; --i)
            prepared.indexes[i] = matchesBest[i];
        return prepared;
    }
}
exports.rank = rank;
