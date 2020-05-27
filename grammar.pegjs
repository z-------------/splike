/*
 * Lisp-like grammar
 */

Program
  = exprs:(Expression _*)* { return exprs.map(element => element[0]); }

Expression
  = t:"'"? l:List {
      if (t === null) {
        return {
          type: "ListExpr",
          fn: l[0],
          operands: l[1],
        };
      } else {
        return [l[0], ...l[1]];
      }
    }
  / SquareList

List
  = "(" expr:ListContents ")" { return expr; }
  
ListContents
  = _* head:Item tail:(_ Item)* _* {
      return [head, tail.map(element => element[1])];
    }

SquareList
  = "[" expr:ListContents "]" {
      return { type: "SquareList", elements: [expr[0], ...expr[1]] };
    }

Item
  = String
  / Number
  / Identifier
  / Expression
  
Identifier
  = IdentifierCharacter+ IdentifierEndCharacter* { return text(); }
 
IdentifierCharacter
  = [A-Za-z_+\-*/^<>=]
  
IdentifierEndCharacter
  = [0-9?]

DoubleStringSourceCharacter
  = !'"' . { return text(); }

SingleStringSourceCharacter
  = !"'" . { return text(); }

String
  = '"' literal:DoubleStringSourceCharacter+ '"' {
      return { type: "StringLiteral", literal: literal.join("") };
    }
  / "'" literal:SingleStringSourceCharacter+ "'" {
      return { type: "StringLiteral", literal: literal.join("") };
    }

Number
  = sig:(Float / Integer) [eE] man:(Float / Integer) { return sig * 10 ** man; }
  / Float
  / Integer

Float
  = Digit* "." Digit+ { return parseFloat(text()); }

Integer
  = Digit+ { return parseInt(text()); }

Digit
  = [0-9]
  
_ "whitespace"
  = [ \t\n\r]+