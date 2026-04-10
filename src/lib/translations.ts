type TranslationKey = string;

interface Translations {
  [key: string]: {
    [locale: string]: string;
  };
}

const translations: Translations = {
  // Common
  "common.dashboard": { en: "Dashboard", es: "Panel", pt: "Painel", fr: "Tableau de bord" },
  "common.notes": { en: "Notes", es: "Notas", pt: "Notas", fr: "Notes" },
  "common.entities": { en: "Entities", es: "Entidades", pt: "Entidades", fr: "Entités" },
  "common.graph": { en: "Graph", es: "Gráfico", pt: "Gráfico", fr: "Graphique" },
  "common.subscription": { en: "Subscription", es: "Suscripción", pt: "Assinatura", fr: "Abonnement" },
  "common.profile": { en: "Profile", es: "Perfil", pt: "Perfil", fr: "Profil" },
  "common.vault": { en: "Vault", es: "Bóveda", pt: "Cofre", fr: "Coffre-fort" },
  "common.search": { en: "Search", es: "Buscar", pt: "Pesquisar", fr: "Rechercher" },
  "common.logout": { en: "Logout", es: "Cerrar sesión", pt: "Sair", fr: "Déconnexion" },
  
  // Dashboard
  "dashboard.hello": { en: "Hello", es: "Hola", pt: "Olá", fr: "Bonjour" },
  "dashboard.summary": { en: "Here's a summary of your activity", es: "Aquí hay un resumen de tu actividad", pt: "Aqui está um resumo da sua atividade", fr: "Voici un résumé de votre activité" },
  "dashboard.manage": { en: "Manage", es: "Gestionar", pt: "Gerenciar", fr: "Gérer" },
  
  // Entity Detail
  "entity.metadata": { en: "Entity Metadata", es: "Metadatos de entidad", pt: "Metadados da entidade", fr: "Métadonnées de l'entité" },
  "entity.createdAt": { en: "Created At", es: "Creado en", pt: "Criado em", fr: "Créé le" },
  "entity.connections": { en: "Number of Connections", es: "Número de conexiones", pt: "Número de conexões", fr: "Nombre de connexions" },
  "entity.type": { en: "Entity Type", es: "Tipo de entidad", pt: "Tipo de entidade", fr: "Type d'entité" },
  "entity.connectedNotes": { en: "Connected Notes", es: "Notas conectadas", pt: "Notas conectadas", fr: "Notes connectées" },
  "entity.connectedEntities": { en: "Connected Entities", es: "Entidades conectadas", pt: "Entidades conectadas", fr: "Entités connectées" },
  "entity.noNotesYet": { en: "No connected notes yet.", es: "Sin notas conectadas aún.", pt: "Sem notas conectadas ainda.", fr: "Pas de notes connectées pour l'instant." },
  "entity.noEntitiesYet": { en: "No connected entities yet.", es: "Sin entidades conectadas aún.", pt: "Sem entidades conectadas ainda.", fr: "Pas d'entités connectées pour l'instant." },
  "entity.notFound": { en: "Entity not found", es: "Entidad no encontrada", pt: "Entidade não encontrada", fr: "Entité non trouvée" },
  "entity.back": { en: "Back", es: "Atrás", pt: "Voltar", fr: "Retour" },
  
  // Habits
  "habit.track": { en: "Track today", es: "Registrar hoy", pt: "Registrar hoje", fr: "Enregistrer aujourd'hui" },
  "habit.doneToday": { en: "Done today ✓", es: "Hecho hoy ✓", pt: "Feito hoje ✓", fr: "Fait aujourd'hui ✓" },
  "habit.last90Days": { en: "Last 90 days", es: "Últimos 90 días", pt: "Últimos 90 dias", fr: "Les 90 derniers jours" },
  "habit.less": { en: "Less", es: "Menos", pt: "Menos", fr: "Moins" },
  "habit.more": { en: "More", es: "Más", pt: "Mais", fr: "Plus" },
  "habit.registered": { en: "Registered! 🔥", es: "¡Registrado! 🔥", pt: "Registrado! 🔥", fr: "Enregistré! 🔥" },
  "habit.streak": { en: "Streak", es: "Racha", pt: "Sequência", fr: "Série" },
  "habit.max": { en: "Max", es: "Máx", pt: "Máximo", fr: "Max" },
  "habit.total": { en: "Total", es: "Total", pt: "Total", fr: "Total" },
  
  // Error messages
  "error.error": { en: "Error", es: "Error", pt: "Erro", fr: "Erreur" },
  "error.errorUpdating": { en: "Error updating", es: "Error al actualizar", pt: "Erro ao atualizar", fr: "Erreur lors de la mise à jour" },
};

export function getTranslation(key: TranslationKey, locale: string = "en"): string {
  const translation = translations[key];
  if (!translation) {
    console.warn(`Translation key not found: ${key}`);
    return key;
  }
  return translation[locale] || translation["en"] || key;
}
