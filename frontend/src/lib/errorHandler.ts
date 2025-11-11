/**
 * Utilitário para tratamento de erros de forma amigável
 */

export interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
    status?: number;
  };
  message?: string;
}

/**
 * Converte erros da API em mensagens amigáveis para o usuário
 */
export function getErrorMessage(error: ApiError): string {
  // Se não há erro, retorna mensagem genérica
  if (!error) {
    return "Ocorreu um erro inesperado. Tente novamente.";
  }

  // Erro de rede ou conexão
  if (!error.response) {
    if (error.message?.includes("Network Error") || error.message?.includes("timeout")) {
      return "Não foi possível conectar ao servidor. Verifique sua conexão com a internet.";
    }
    return "Erro ao comunicar com o servidor. Tente novamente em instantes.";
  }

  const status = error.response.status;
  const data = error.response.data;

  // Mensagem personalizada do servidor
  if (data?.message) {
    return data.message;
  }

  // Tratamento por código de status HTTP
  switch (status) {
    case 400:
      return "Dados inválidos. Verifique as informações e tente novamente.";
    case 401:
      return "Credenciais inválidas. Verifique seu e-mail e senha.";
    case 403:
      return "Você não tem permissão para realizar esta ação.";
    case 404:
      return "Recurso não encontrado.";
    case 409:
      return "Este registro já existe. Verifique os dados informados.";
    case 422:
      // Erros de validação
      if (data?.errors) {
        const firstError = Object.values(data.errors)[0];
        if (Array.isArray(firstError) && firstError.length > 0) {
          return firstError[0];
        }
      }
      return "Dados inválidos. Verifique os campos do formulário.";
    case 500:
      return "Erro interno do servidor. Tente novamente mais tarde.";
    case 503:
      return "Serviço temporariamente indisponível. Tente novamente em alguns instantes.";
    default:
      return "Ocorreu um erro inesperado. Tente novamente.";
  }
}

/**
 * Extrai mensagens de erro de validação (quando há múltiplos erros)
 */
export function getValidationErrors(error: ApiError): Record<string, string> {
  const errors: Record<string, string> = {};

  if (error.response?.data?.errors) {
    Object.entries(error.response.data.errors).forEach(([field, messages]) => {
      if (Array.isArray(messages) && messages.length > 0) {
        errors[field] = messages[0];
      }
    });
  }

  return errors;
}

/**
 * Verifica se o erro é de autenticação (401)
 */
export function isAuthError(error: ApiError): boolean {
  return error.response?.status === 401;
}

/**
 * Verifica se o erro é de validação (422)
 */
export function isValidationError(error: ApiError): boolean {
  return error.response?.status === 422 || error.response?.status === 400;
}

