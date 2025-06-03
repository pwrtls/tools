export interface QueryContext {
  type: 'entity' | 'attribute' | 'none';
  keyword?: string;
  entityName?: string;
  currentWord: string;
  position: number;
}

export class QueryParser {
  private static readonly SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER',
    'ORDER', 'BY', 'GROUP', 'HAVING', 'AND', 'OR', 'NOT', 'IN', 'LIKE',
    'BETWEEN', 'IS', 'NULL', 'AS', 'ON', 'DISTINCT', 'COUNT', 'SUM', 'AVG',
    'MIN', 'MAX', 'TOP', 'ASC', 'DESC'
  ];

  public static parseQueryContext(query: string, cursorPosition: number): QueryContext {
    const beforeCursor = query.substring(0, cursorPosition);
    
    // Find the current word being typed
    const currentWordMatch = beforeCursor.match(/(\w+)$/);
    const currentWord = currentWordMatch ? currentWordMatch[1] : '';
    
    // Check if we're after a dot (for attribute suggestions)
    const dotMatch = beforeCursor.match(/(\w+)\.(\w*)$/);
    if (dotMatch) {
      const entityName = dotMatch[1];
      const partialAttribute = dotMatch[2];
      return {
        type: 'attribute',
        entityName,
        currentWord: partialAttribute,
        position: cursorPosition
      };
    }

    // Convert to uppercase for keyword matching
    const upperQuery = beforeCursor.toUpperCase();
    
    // Check for entity contexts (after FROM, JOIN keywords)
    const entityKeywords = ['FROM', 'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'OUTER JOIN'];
    for (const keyword of entityKeywords) {
      const keywordIndex = upperQuery.lastIndexOf(keyword);
      if (keywordIndex !== -1) {
        const afterKeyword = beforeCursor.substring(keywordIndex + keyword.length).trim();
        
        // Check if we're still in the entity context (no other keywords after)
        const hasSubsequentKeyword = this.SQL_KEYWORDS.some(kw => 
          afterKeyword.toUpperCase().includes(kw) && kw !== keyword.split(' ').pop()
        );
        
        if (!hasSubsequentKeyword || afterKeyword.split(/\s+/).length <= 2) {
          return {
            type: 'entity',
            keyword,
            currentWord,
            position: cursorPosition
          };
        }
      }
    }

    // Check for attribute contexts (after SELECT, WHERE, ORDER BY, GROUP BY)
    const attributeKeywords = ['SELECT', 'WHERE', 'ORDER BY', 'GROUP BY'];
    for (const keyword of attributeKeywords) {
      const keywordIndex = upperQuery.lastIndexOf(keyword);
      if (keywordIndex !== -1) {
        // Find the FROM clause to determine the entity context
        const fromIndex = upperQuery.indexOf('FROM', keywordIndex);
        if (fromIndex !== -1) {
          const fromClause = beforeCursor.substring(fromIndex + 4).trim();
          const entityMatch = fromClause.match(/^\s*(\w+)/);
          if (entityMatch) {
            const entityName = entityMatch[1];
            
            // Check if we're still in attribute context
            const isInAttributeContext = keyword === 'SELECT' || 
              (keyword === 'WHERE' && cursorPosition > fromIndex) ||
              (keyword === 'ORDER BY' && cursorPosition > fromIndex) ||
              (keyword === 'GROUP BY' && cursorPosition > fromIndex);
            
            if (isInAttributeContext) {
              return {
                type: 'attribute',
                keyword,
                entityName,
                currentWord,
                position: cursorPosition
              };
            }
          }
        }
      }
    }

    return {
      type: 'none',
      currentWord,
      position: cursorPosition
    };
  }

  public static extractEntityFromQuery(query: string): string | null {
    const upperQuery = query.toUpperCase();
    const fromIndex = upperQuery.indexOf('FROM');
    
    if (fromIndex === -1) return null;
    
    const fromClause = query.substring(fromIndex + 4).trim();
    const entityMatch = fromClause.match(/^\s*(\w+)/);
    
    return entityMatch ? entityMatch[1] : null;
  }

  public static isValidSqlKeyword(word: string): boolean {
    return this.SQL_KEYWORDS.includes(word.toUpperCase());
  }
} 