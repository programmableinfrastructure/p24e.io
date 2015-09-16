# Adds a property "document_name" to all Liquid documents that equals the file name.
#
# Example:
#
#   _tech/coreos.md => "coreos"
#
Jekyll::Document.class_eval do
  def to_liquid_with_document_name
    to_liquid_without_document_name.merge "document_name" => basename_without_ext
  end
  alias_method :to_liquid_without_document_name, :to_liquid
  alias_method :to_liquid, :to_liquid_with_document_name
end
