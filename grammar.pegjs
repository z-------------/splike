{
  const Type = require("./type");
}

Program
  = exprs:(Expression _*)* { return exprs.map(element => element[0]); }

Expression
  = t:"'"? l:List {
      if (t === null) {
        return {
          type: Type.ListExpr,
          head: l[0],
          tail: l[1],
        };
      } else {
        if (l[0].type === Type.Empty) return [];
        else return [l[0], ...l[1]];
      }
    }
  / SquareList

List
  = "(" expr:ListContents ")" { return expr; }

ListContents
  = _* head:Item tail:(_ Item)* _* {
      return [head, tail.map(element => element[1])];
    }
  / _* { return [{ type: Type.Empty }, []]; }

SquareList
  = "[" expr:ListContents "]" {
      const elements = expr[0].type === Type.Empty ? [] : [expr[0], ...expr[1]];
      return { type: Type.SquareList, elements };
    }

Item
  = Number
  / Boolean
  / Identifier
  / Expression
  / String

Identifier
  = IdentifierCharacter+ IdentifierEndCharacter* { return text(); }

IdentifierCharacter
  = [A-Za-z_+\-.*/^<>=#&]

IdentifierEndCharacter
  = [0-9?]

DoubleStringSourceCharacter
  = !'"' . { return text(); }

SingleStringSourceCharacter
  = !"'" . { return text(); }

String
  = '"' literal:DoubleStringSourceCharacter+ '"' {
      return { type: Type.StringLiteral, literal: literal.join("") };
    }
  / "'" literal:SingleStringSourceCharacter+ "'" {
      return { type: Type.StringLiteral, literal: literal.join("") };
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
