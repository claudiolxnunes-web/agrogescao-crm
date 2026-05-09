import { Resend } from "resend";
import { ENV } from "./_core/env";

const resend = new Resend(ENV.resendApiKey);

export interface SendCredentialsEmailParams {
  representativeName: string;
  representativeEmail: string;
  email: string;
  password: string;
  fieldReportUrl: string;
}

export async function sendCredentialsEmail({
  representativeName,
  representativeEmail,
  email,
  password,
  fieldReportUrl,
}: SendCredentialsEmailParams): Promise<boolean> {
  if (!ENV.resendApiKey || !ENV.resendFromEmail) {
    console.warn("Resend credentials not configured, skipping email send");
    return false;
  }

  try {
    const htmlContent = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        line-height: 1.6;
        color: #333;
        background-color: #f5f5f5;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header {
        background: linear-gradient(135deg, #2d5016 0%, #1a7f3d 100%);
        color: white;
        padding: 30px 20px;
        text-align: center;
      }
      .header h1 {
        margin: 0;
        font-size: 28px;
      }
      .content {
        padding: 30px 20px;
      }
      .greeting {
        font-size: 18px;
        margin-bottom: 20px;
        color: #2d5016;
        font-weight: 600;
      }
      .credentials-box {
        background-color: #f0f7f0;
        border-left: 4px solid #2d5016;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .credential-item {
        margin: 12px 0;
        display: flex;
        align-items: center;
      }
      .credential-label {
        font-weight: 600;
        color: #2d5016;
        min-width: 100px;
      }
      .credential-value {
        font-family: 'Courier New', monospace;
        background-color: white;
        padding: 8px 12px;
        border-radius: 4px;
        flex: 1;
        word-break: break-all;
      }
      .cta-button {
        display: inline-block;
        background-color: #2d5016;
        color: white;
        padding: 12px 30px;
        text-decoration: none;
        border-radius: 4px;
        margin: 20px 0;
        font-weight: 600;
        text-align: center;
      }
      .cta-button:hover {
        background-color: #1a7f3d;
      }
      .instructions {
        background-color: #fffbf0;
        border-left: 4px solid #ff9800;
        padding: 15px;
        margin: 20px 0;
        border-radius: 4px;
      }
      .instructions h3 {
        margin: 0 0 10px 0;
        color: #ff9800;
      }
      .instructions ol {
        margin: 10px 0;
        padding-left: 20px;
      }
      .instructions li {
        margin: 8px 0;
      }
      .footer {
        background-color: #f5f5f5;
        padding: 20px;
        text-align: center;
        border-top: 1px solid #e0e0e0;
        font-size: 12px;
        color: #666;
      }
      .footer-logo {
        font-weight: 600;
        color: #2d5016;
        margin-bottom: 5px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>🌾 AgroGestão CRM</h1>
        <p>Suas credenciais de acesso</p>
      </div>

      <div class="content">
        <div class="greeting">
          Olá, <strong>${representativeName}</strong>!
        </div>

        <p>
          Bem-vindo ao <strong>AgroGestão CRM</strong>! Suas credenciais de acesso foram geradas com sucesso.
          Use os dados abaixo para fazer login no aplicativo mobile de registro de campo.
        </p>

        <div class="credentials-box">
          <div class="credential-item">
            <div class="credential-label">📧 Email:</div>
            <div class="credential-value">${email}</div>
          </div>
          <div class="credential-item">
            <div class="credential-label">🔑 Senha:</div>
            <div class="credential-value">${password}</div>
          </div>
        </div>

        <div style="text-align: center;">
          <a href="${fieldReportUrl}" class="cta-button">
            ➜ Acessar AgroGestão CRM
          </a>
        </div>

        <div class="instructions">
          <h3>📱 Como acessar pelo celular:</h3>
          <ol>
            <li>Abra o navegador do seu celular (Chrome, Safari, Firefox)</li>
            <li>Acesse: <strong>${fieldReportUrl}</strong></li>
            <li>Faça login com seu email e senha</li>
            <li>Você verá a página de Registro de Campo (/campo)</li>
            <li>Registre suas atividades do dia (visitas, ligações, propostas)</li>
            <li>Clique em "Enviar Relatório" para consolidar o dia</li>
          </ol>
        </div>

        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          <strong>⚠️ Importante:</strong> Guarde suas credenciais com segurança. Não compartilhe sua senha com outras pessoas.
          Se esquecer sua senha, solicite ao seu gerente que redefina.
        </p>
      </div>

      <div class="footer">
        <div class="footer-logo">AgroGestão CRM</div>
        <p style="margin: 5px 0;">Plataforma de Gestão Regional de Vendas</p>
        <p style="margin: 5px 0;">© 2026 BPF Consult. Todos os direitos reservados.</p>
      </div>
    </div>
  </body>
</html>
    `;

    const response = await resend.emails.send({
      from: `${ENV.resendFromName} <${ENV.resendFromEmail}>`,
      to: representativeEmail,
      cc: ENV.resendCcEmail ? [ENV.resendCcEmail] : undefined,
      subject: "Suas credenciais de acesso - AgroGestão CRM",
      html: htmlContent,
    });

    if (response.error) {
      console.error("Error sending email:", response.error);
      return false;
    }

    console.log("Email sent successfully:", response.data?.id);
    return true;
  } catch (error) {
    console.error("Error sending credentials email:", error);
    return false;
  }
}
