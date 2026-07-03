// =============================================================================
// ARMILLA SEGURA — Validação de telefone brasileiro
// Arquivo: TelefoneBrasileiroAttribute.cs
// LOCALIZAÇÃO: Armilla_Backend/Validacao/TelefoneBrasileiroAttribute.cs
// =============================================================================
// POR QUE ISTO EXISTE:
//   O atributo [Phone] do ASP.NET Core é genérico demais — ele aceita
//   praticamente qualquer sequência com dígitos e símbolos comuns de
//   telefone, de qualquer país, sem validar DDD nem quantidade de dígitos.
//   Isso é o que o usuário pediu como "verificação de números": validar
//   formato/DDD ao cadastrar um contato, sem precisar de nenhum serviço
//   externo pago (diferente de confirmar por SMS, que é outra etapa,
//   futura, que exige um provedor como Twilio/Zenvia).
//
// O QUE ACEITA:
//   - DDD de 2 dígitos, entre 11 e 99 (o Brasil não usa DDDs come 10 ou
//     terminado em 0 logo após o 1º dígito — na prática os DDDs válidos
//     vão de 11 a 99, sem 0 ou 1 como segundo dígito isolado; a validação
//     aqui é de FORMATO, não consulta a lista oficial completa da Anatel)
//   - Celular: 9 dígitos começando com 9 (padrão desde 2016)
//   - Fixo: 8 dígitos
//   - Com ou sem +55, com ou sem parênteses/espaço/hífen
//
// EXEMPLOS VÁLIDOS: "(11) 99999-9999", "11999999999", "+55 11 99999-9999"
// EXEMPLOS INVÁLIDOS: "123", "00 00000-0000", "abcdefghij"
// =============================================================================

using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace Armilla.Backend.Validacao;

public class TelefoneBrasileiroAttribute : ValidationAttribute
{
    // +55 opcional, DDD 2 dígitos (11-99), depois 8 ou 9 dígitos
    private static readonly Regex Padrao = new(
        @"^(\+?55\s?)?\(?([1-9][1-9])\)?\s?9?\d{4}-?\d{4}$",
        RegexOptions.Compiled);

    public TelefoneBrasileiroAttribute()
    {
        ErrorMessage = "Telefone inválido. Use o formato (DDD) 99999-9999.";
    }

    public override bool IsValid(object? value)
    {
        if (value is null) return true; // [Required] separado cuida de obrigatoriedade
        if (value is not string telefone || string.IsNullOrWhiteSpace(telefone)) return false;

        return Padrao.IsMatch(telefone.Trim());
    }
}
