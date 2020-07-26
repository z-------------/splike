{
  const NodeType = require("./nodeType");
}

Program
  = _* exprs:(Expression _*)* { return exprs.map(element => element[0]); }

Expression
  = expr:List { return { type: NodeType.List, data: expr, location: location() }; }
  / expr:QuotedList { return { type: NodeType.QuotedList, data: expr }; }
  / expr:Vector { return { type: NodeType.Vector, data: expr }; }
  / Comment { return null; }

Comment
  = ';' [^\n]*

ListContents
  = _* head:Item tail:(_ Item)* _* {
      return [head, ...tail.map(element => element[1])];
    }
  / _* { return []; }

List
  = "(" expr:ListContents ")" { return expr; }

QuotedList
  = "'(" expr:ListContents ")" { return expr; }

Vector
  = "[" expr:ListContents "]" { return expr; }

Hash
  = "{" _* pairs:(HashPair _* "," _*)* lastPair:HashPair* _* "}" {
  	  return { type: NodeType.Hash, data: [...pairs.map(n => n[0]), ...lastPair] };
    }

HashPair
  = key:Identifier _* val:Item { return [key.data, val]; }

Item
  = Number
  / Boolean
  / Expression
  / String
  / Identifier
  / Hash

Identifier
  = IdentifierCharacter+ IdentifierEndCharacter* { return { type: NodeType.Identifier, data: text() }; }

IdentifierCharacter
  = [A-Za-z_+\-.*/^<>=#&]

IdentifierEndCharacter
  = [0-9?]

String
  = DoubleString
  / DoubleRawString
  / SingleString
  / SingleRawString

DoubleString
  = '"' c:DoubleStringCharacter* '"' {
  	  return { type: NodeType.String, data: c.join("") };
    }

DoubleRawString
  = 'r"' c:DoubleRawStringCharacter* '"' {
      return { type: NodeType.String, data: c.join("") };
    }

DoubleStringCharacter
  = [^\0-\x1F\\"]
  / '\\' seq:('"' / StringGeneralEscapeSequence) { return seq; }

DoubleRawStringCharacter
  = '\\"' { return "\""; }
  / [^\0-\x1F"]

SingleString
  = "'" c:SingleStringCharacter* "'" {
  	  return { type: NodeType.String, data: c.join("") };
    }

SingleRawString
  = "r'" c:SingleRawStringCharacter* "'" {
      return { type: NodeType.String, data: c.join("") };
    }

SingleStringCharacter
  = [^\0-\x1F\\']
  / '\\' seq:("'" / StringGeneralEscapeSequence) { return seq; }

SingleRawStringCharacter
  = "\\'" { return "'"; }
  / [^\0-\x1F']

StringGeneralEscapeSequence
  = "b" { return "\b"; }
  / "f" { return "\f"; }
  / "n" { return "\n"; }
  / "r" { return "\r"; }
  / "t" { return "\t"; }
  / "v" { return "\v"; }
  / "0" { return "\0"; }
  / "\\"
  / "u" digits:$(HexDigit HexDigit HexDigit HexDigit) {
    return String.fromCharCode(parseInt(digits, 16));
  }

Boolean
  = "true" !IdentifierCharacter { return true; }
  / "false" !IdentifierCharacter { return false; }

Number
  = ScientificNumber
  / Float
  / Integer

NumberSign
  = [+-]

ScientificNumber
  = NumberSign? (Float / Integer) "e"i (Float / Integer) { return parseFloat(text()); }

Float
  = NumberSign? Digit* "." Digit+ { return parseFloat(text()); }

Integer
  = NumberSign? Digit+ { return parseInt(text()); }

Digit
  = [0-9]

HexDigit
  = [0-9a-f]i

_ "whitespace"
  = [ \t\n\r]+
