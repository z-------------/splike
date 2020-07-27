Source = s:(Code / String / Comment)* { return s.join(""); }

Code = [^"';]+ { return text(); }

String
  = (DoubleString / SingleString) { return text(); }

DoubleString
  = '"' (('\\"' / !'"') .)* '"'

SingleString
  = "'" (("\\'" / !"'") .)* "'"

Comment = ';' [^\n]* { return ""; }
