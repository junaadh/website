; Highlights for Eitri, using Helix capture names.
; Later patterns take precedence over earlier ones (Helix convention): generic
; identifier rules come first, specific ones after.

; ---------------------------------------------------------------- identifiers
(identifier) @variable
(property_identifier) @variable.other.member
(self) @variable.builtin
(wildcard) @variable.builtin

; capitalised names used as values are types, ALL_CAPS ones are constants
((identifier) @type
  (#match? @type "^[A-Z]"))
((identifier) @constant
  (#match? @constant "^[A-Z][A-Z0-9_]+$"))

; ---------------------------------------------------------------------- types
(type_identifier) @type
(primitive_type) @type.builtin
(namespace_identifier) @namespace
(module_identifier) @namespace
(type_parameter name: (type_identifier) @type.parameter)

; built-in constraints and Self
((type_identifier) @type.builtin
  (#any-of? @type.builtin "Eq" "Ordered" "Numeric" "Formattable" "Self"))
((identifier) @type.builtin
  (#any-of? @type.builtin "Self"))

; ------------------------------------------------------------------ functions
(member_expression
  property: (property_identifier) @type.enum.variant
  (#match? @type.enum.variant "^[A-Z]"))

(function_declaration name: (identifier) @function)
(method_declaration name: (identifier) @function.method)

(call_expression
  function: (identifier) @function)
(call_expression
  function: (member_expression
    property: (property_identifier) @function.method))

; constructors: Type(...) and Enum.Case(...)
(call_expression
  function: (identifier) @constructor
  (#match? @constructor "^[A-Z]"))
(call_expression
  function: (member_expression
    property: (property_identifier) @constructor
    (#match? @constructor "^[A-Z]")))

; scalar conversions such as i64(x) or string(x)
(call_expression
  function: (identifier) @type.builtin
  (#any-of? @type.builtin
    "i8" "i16" "i32" "i64" "u8" "u16" "u32" "u64" "isize" "usize"
    "f32" "f64" "bool" "char" "string" "bytes" "void"))

; host module imports
(import_declaration name: (module_identifier) @namespace)

; ----------------------------------------------------------------- parameters
(parameter name: (identifier) @variable.parameter)
(lambda_parameter name: (identifier) @variable.parameter)
(argument label: (identifier) @variable.parameter)
(payload_pattern label: (identifier) @variable.parameter)
(case_field name: (identifier) @variable.parameter)

; --------------------------------------------------------------------- fields
(field_declaration name: (identifier) @variable.other.member)
(field_initializer name: (identifier) @variable.other.member)
(field_binding name: (identifier) @variable.other.member)
(static_declaration name: (identifier) @constant)

; ---------------------------------------------------------------- enum cases
(enum_case name: (identifier) @type.enum.variant)
(enum_shorthand name: (variant_identifier) @type.enum.variant)
(enum_pattern name: (variant_identifier) @type.enum.variant)
(enum_pattern path: (type_identifier) @type)

; ------------------------------------------------------------------- literals
(integer_literal) @constant.numeric.integer
(float_literal) @constant.numeric.float
(boolean_literal) @constant.builtin.boolean
(null_literal) @constant.builtin
(char_literal) @constant.character
(escape_sequence) @constant.character.escape

(string_literal) @string
(raw_string_literal) @string
(string_content) @string
(import_declaration source: (string_literal) @string.special.path)
(interpolation "${" @punctuation.special)
(interpolation "}" @punctuation.special)

; ----------------------------------------------------------------- attributes
(attribute_name) @attribute
(label) @label

; ------------------------------------------------------------------- keywords
[
  "let"
  "var"
] @keyword.storage

[
  "struct"
  "class"
  "enum"
  "interface"
  "extend"
  "type"
] @keyword.storage.type

[
  "static"
  "mutating"
] @keyword.storage.modifier

(visibility_modifier) @keyword.storage.modifier

"fn" @keyword.function

[
  "if"
  "else"
  "match"
  "guard"
] @keyword.control.conditional

[
  "while"
  "for"
  "in"
  "break"
  "continue"
] @keyword.control.repeat

"return" @keyword.control.return

[
  "try"
  "try?"
  "defer"
] @keyword.control.exception

[
  "async"
  "await"
  "spawn"
] @keyword.control

[
  "import"
  "from"
] @keyword.control.import

[
  "map"
  "task"
  "weak"
  "chan"
  "any"
] @keyword

; ------------------------------------------------------------------ operators
[
  "+" "-" "*" "/" "%" "&+" "&-" "&*"
  "&" "|" "^" "~" "<<" ">>"
  "&&" "||" "!" "??"
  "==" "!=" "<" "<=" ">" ">="
  "=" "+=" "-=" "*=" "/=" "%=" "&+=" "&-=" "&*=" "&=" "|=" "^=" "<<=" ">>="
  ".." "..="
  "=>" "->"
] @operator

(optional_type "?" @operator)
(result_type "!" @operator)

; the angle brackets of generics are brackets, not comparison operators
(type_arguments ["<" ">"] @punctuation.bracket)
(type_parameters ["<" ">"] @punctuation.bracket)
(grouped_type ["<" ">"] @punctuation.bracket)

; ---------------------------------------------------------------- punctuation
["(" ")" "[" "]" "{" "}"] @punctuation.bracket
["," ";" ":" "."] @punctuation.delimiter
(member_expression operator: _ @punctuation.delimiter)

; ------------------------------------------------------------------- comments
(comment) @comment
