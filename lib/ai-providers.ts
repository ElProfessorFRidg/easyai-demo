export enum AIProvider {
  OpenAI = 'openai',
  Anthropic = 'anthropic',
  Cohere = 'cohere',
  // Ajoutez d'autres fournisseurs ici
}

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  // Ajoutez d'autres configurations spécifiques au fournisseur si nécessaire
  // par exemple, modèles disponibles, icônes, etc.
}

export const aiProviders: AIProviderConfig[] = [
  { id: AIProvider.OpenAI, name: 'OpenAI (GPT)' },
  { id: AIProvider.Anthropic, name: 'Anthropic (Claude)' },
  { id: AIProvider.Cohere, name: 'Cohere' },
];

export const getDefaultProvider = (): AIProviderConfig => {
  return aiProviders[0];
};

// Fonction pour récupérer la configuration d'un fournisseur par son ID
export const getProviderConfigById = (id: AIProvider): AIProviderConfig | undefined => {
  return aiProviders.find(provider => provider.id === id);
};