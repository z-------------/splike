{
  const NodeType = require("./nodeType");
}

Program
  = exprs:(Expression _*)* { return exprs.map(element => element[0]); }

Expression
  = expr:List { return { type: NodeType.List, data: expr, location: location() }; }
  / expr:QuotedList { return { type: NodeType.QuotedList, data: expr, location: location() }; }
  / expr:Vector { return { type: NodeType.Vector, data: expr, location: location() }; }

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
  = key:Identifier _* val:Item { return [key, val]; }

Item
  = Number
  / Boolean
  / Identifier
  / Expression
  / String
  / Hash

Identifier
  = IdentifierCharacter+ IdentifierEndCharacter* { return { type: NodeType.Identifier, data: text(), location: location() }; }

IdentifierCharacter
  = [A-Za-z_+\-.*/^<>=#&]

IdentifierEndCharacter
  = [0-9?]

DoubleStringSourceCharacter
  = !'"' . { return text(); }

SingleStringSourceCharacter
  = !"'" . { return text(); }

String
  = '"' literal:DoubleStringSourceCharacter* '"' {
      return { type: NodeType.String, data: literal.join(""), location: location() };
    }
  / "'" literal:SingleStringSourceCharacter* "'" {
      return { type: NodeType.String, data: literal.join(""), location: location() };
    }

Boolean
  = "true" !IdentifierCharacter { return true; }
  / "false" !IdentifierCharacter { return false; }

Number
  = sig:(Float / Integer) "e"i man:(Float / Integer) { return sig * 10 ** man; }
  / Float
  / Integer

Float
  = "-"? Digit* "." Digit+ { return parseFloat(text()); }

Integer
  = "-"? Digit+ { return parseInt(text()); }

Digit
  = [0-9]

_ "whitespace"
  = [ \t\n\r]+
