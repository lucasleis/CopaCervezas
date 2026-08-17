import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createEvaluacion, type MuestraVuelo } from "@/api/cata";
import { cn } from "@/lib/utils";

interface Props {
  edicionId: string;
  vueloId: string;
  muestra: MuestraVuelo;
  juezEmail?: string;
  onSuccess: () => void;
}

// --- Escalas ---

const ESCALA_INTENSIDAD = ["Nulo", "Bajo", "Medio Bajo", "Medio", "Medio Alto", "Alto"] as const;
const ESCALA_BALANCE = [
  "Plenamente Lupulada",
  "Lupulada",
  "Equilibrada",
  "Maltosa",
  "Plenamente Maltosa",
] as const;
const ESCALA_CALIDAD_TECNICA = [
  "Defectos significativos",
  "Fallas menores",
  "Buena",
  "Muy buena",
  "Excelente",
] as const;
const ESCALA_MERITO_ESTILISTICO = [
  "Fuera de estilo",
  "No muy representativo",
  "Representativo",
  "Muy representativo",
] as const;
const ESCALA_FUERZA_RELATIVA = Array.from({ length: 10 }, (_, i) => i + 1);

interface AttrValue {
  valor: string;
  inapropiado: boolean;
}

const attrVacio = (): AttrValue => ({ valor: "", inapropiado: false });

function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function attrInvalido(attr: AttrValue): boolean {
  return !attr.inapropiado && !attr.valor;
}

// Opciones cuyo texto se divide en dos líneas dentro del botón por ser largas.
const OPCIONES_DOS_LINEAS: Record<string, [string, string]> = {
  "Plenamente Lupulada": ["Plenamente", "Lupulada"],
  "Plenamente Maltosa": ["Plenamente", "Maltosa"],
  "No muy representativo": ["No muy", "representativo"],
  "Muy representativo": ["Muy", "representativo"],
  "Defectos significativos": ["Defectos", "significativos"],
  "Muy buena": ["Muy", "buena"],
};

function OptionLabel({ text }: { text: string }) {
  const lineas = OPCIONES_DOS_LINEAS[text];
  if (!lineas) return <>{text}</>;
  return (
    <span className="flex flex-col items-center text-center leading-tight">
      <span>{lineas[0]}</span>
      <span>{lineas[1]}</span>
    </span>
  );
}

// --- Subcomponentes de UI ---

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-neutral-200">
      <div className="bg-neutral-800 px-3 py-1.5 text-xs font-bold tracking-wide text-white uppercase">
        {title}
      </div>
      <div className="space-y-3 p-2.5">{children}</div>
    </div>
  );
}

function AttributeField({
  label,
  options,
  value,
  onChange,
  error,
  itemClassName,
}: {
  label: string;
  options: readonly string[];
  value: AttrValue;
  onChange: (next: AttrValue) => void;
  error?: boolean;
  itemClassName?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-sm font-semibold tracking-wide uppercase",
            error ? "text-red-600" : "text-danger-600"
          )}
        >
          {label}
        </span>
        <Label htmlFor={`${label}-inapropiado`} className="gap-1.5 text-sm text-neutral-500">
          <Checkbox
            id={`${label}-inapropiado`}
            checked={value.inapropiado}
            onCheckedChange={(checked) => onChange({ valor: value.valor, inapropiado: checked })}
          />
          Inapropiado
        </Label>
      </div>
      <ToggleGroup
        value={value.valor ? [value.valor] : []}
        onValueChange={(next) => onChange({ valor: next[0] ?? "", inapropiado: false })}
        disabled={value.inapropiado}
        className={cn(
          "w-full flex-nowrap overflow-x-auto",
          value.inapropiado && "opacity-40"
        )}
      >
        {options.map((opt) => (
          <ToggleGroupItem
            key={opt}
            value={opt}
            className={cn(
              "h-auto flex-1 px-1.5 py-2 text-sm",
              itemClassName,
              OPCIONES_DOS_LINEAS[opt] && "min-h-[2.5rem]",
              error && "border-red-500"
            )}
          >
            <OptionLabel text={opt} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

function ObservacionesField({
  label,
  value,
  onChange,
  minWords,
  error,
  optional,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  minWords: number;
  error?: boolean;
  optional?: boolean;
}) {
  const words = countWords(value);
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium text-neutral-700">
        {label} {!optional && <span className="text-red-500">*</span>}
      </Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        aria-invalid={error}
        className="text-xs"
      />
      {!optional && (
        <p className={cn("text-sm", error ? "text-destructive" : "text-neutral-400")}>
          {words}/{minWords} palabras mínimo
        </p>
      )}
    </div>
  );
}

function RadioRow({
  options,
  value,
  onChange,
  error,
  itemClassName,
  groupClassName,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
  error?: boolean;
  itemClassName?: string;
  groupClassName?: string;
}) {
  return (
    <div className="space-y-1">
      <ToggleGroup
        value={value ? [value] : []}
        onValueChange={(next) => onChange(next[0] ?? "")}
        className={cn(
          "w-full flex-nowrap overflow-x-auto",
          groupClassName,
          error && "rounded-md ring-1 ring-red-300"
        )}
      >
        {options.map((opt) => (
          <ToggleGroupItem
            key={opt}
            value={opt}
            className={cn(
              "h-auto flex-1 px-1.5 py-2 text-sm",
              itemClassName,
              OPCIONES_DOS_LINEAS[opt] && "min-h-[2.5rem]"
            )}
          >
            <OptionLabel text={opt} />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {error && <p className="text-sm text-destructive">Este campo es obligatorio</p>}
    </div>
  );
}

export default function EvaluacionForm({
  edicionId,
  vueloId,
  muestra,
  juezEmail,
  onSuccess,
}: Props) {
  const queryClient = useQueryClient();

  const [aparienciaObs, setAparienciaObs] = useState("");

  const [aromaAttrs, setAromaAttrs] = useState({
    malta: attrVacio(),
    lupulo: attrVacio(),
    fermentacion: attrVacio(),
    otrosIngredientes: attrVacio(),
  });
  const [aromaObs, setAromaObs] = useState("");

  const [saborAttrs, setSaborAttrs] = useState({
    malta: attrVacio(),
    lupulo: attrVacio(),
    amargor: attrVacio(),
    fermentacion: attrVacio(),
    balance: attrVacio(),
  });
  const [saborObs, setSaborObs] = useState("");

  const [sensacionAttrs, setSensacionAttrs] = useState({
    cuerpo: attrVacio(),
    carbonatacion: attrVacio(),
    cremosidad: attrVacio(),
    calentamiento: attrVacio(),
    astringencia: attrVacio(),
  });
  const [sensacionObs, setSensacionObs] = useState("");

  const [calidadTecnica, setCalidadTecnica] = useState("");
  const [meritoEstilistico, setMeritoEstilistico] = useState("");
  const [fuerzaRelativa, setFuerzaRelativa] = useState<number | null>(null);

  const [devolucionObs, setDevolucionObs] = useState("");
  const [avanza, setAvanza] = useState<boolean | null>(null);

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  function resetForm() {
    setAparienciaObs("");
    setAromaAttrs({
      malta: attrVacio(),
      lupulo: attrVacio(),
      fermentacion: attrVacio(),
      otrosIngredientes: attrVacio(),
    });
    setAromaObs("");
    setSaborAttrs({
      malta: attrVacio(),
      lupulo: attrVacio(),
      amargor: attrVacio(),
      fermentacion: attrVacio(),
      balance: attrVacio(),
    });
    setSaborObs("");
    setSensacionAttrs({
      cuerpo: attrVacio(),
      carbonatacion: attrVacio(),
      cremosidad: attrVacio(),
      calentamiento: attrVacio(),
      astringencia: attrVacio(),
    });
    setSensacionObs("");
    setCalidadTecnica("");
    setMeritoEstilistico("");
    setFuerzaRelativa(null);
    setDevolucionObs("");
    setAvanza(null);
    setAttemptedSubmit(false);
  }

  const errors = useMemo(
    () => ({
      apariencia: countWords(aparienciaObs) < 5,
      aromaMalta: attrInvalido(aromaAttrs.malta),
      aromaLupulo: attrInvalido(aromaAttrs.lupulo),
      aromaFermentacion: attrInvalido(aromaAttrs.fermentacion),
      aromaOtros: attrInvalido(aromaAttrs.otrosIngredientes),
      aromaObs: countWords(aromaObs) < 10,
      saborMalta: attrInvalido(saborAttrs.malta),
      saborLupulo: attrInvalido(saborAttrs.lupulo),
      saborAmargor: attrInvalido(saborAttrs.amargor),
      saborFermentacion: attrInvalido(saborAttrs.fermentacion),
      saborBalance: attrInvalido(saborAttrs.balance),
      saborObs: countWords(saborObs) < 10,
      sensacionCuerpo: attrInvalido(sensacionAttrs.cuerpo),
      sensacionCarbonatacion: attrInvalido(sensacionAttrs.carbonatacion),
      sensacionCremosidad: attrInvalido(sensacionAttrs.cremosidad),
      sensacionCalentamiento: attrInvalido(sensacionAttrs.calentamiento),
      sensacionAstringencia: attrInvalido(sensacionAttrs.astringencia),
      calidadTecnica: !calidadTecnica,
      meritoEstilistico: !meritoEstilistico,
      fuerzaRelativa: fuerzaRelativa === null,
      devolucionObs: countWords(devolucionObs) < 20,
      avanza: avanza === null,
    }),
    [
      aparienciaObs,
      aromaAttrs,
      aromaObs,
      saborAttrs,
      saborObs,
      sensacionAttrs,
      calidadTecnica,
      meritoEstilistico,
      fuerzaRelativa,
      devolucionObs,
      avanza,
    ]
  );

  const hasErrors = Object.values(errors).some(Boolean);
  const mostrarError = (key: keyof typeof errors) => attemptedSubmit && errors[key];

  const mutation = useMutation({
    mutationFn: () => {
      const puntajes = {
        apariencia: { observaciones: aparienciaObs.trim() },
        aroma: {
          malta: aromaAttrs.malta,
          lupulo: aromaAttrs.lupulo,
          fermentacion: aromaAttrs.fermentacion,
          otros_ingredientes: aromaAttrs.otrosIngredientes,
          observaciones: aromaObs.trim(),
        },
        sabor: {
          malta: saborAttrs.malta,
          lupulo: saborAttrs.lupulo,
          amargor: saborAttrs.amargor,
          fermentacion: saborAttrs.fermentacion,
          balance: saborAttrs.balance,
          observaciones: saborObs.trim(),
        },
        sensacion_en_boca: {
          cuerpo: sensacionAttrs.cuerpo,
          carbonatacion: sensacionAttrs.carbonatacion,
          cremosidad: sensacionAttrs.cremosidad,
          calentamiento: sensacionAttrs.calentamiento,
          astringencia: sensacionAttrs.astringencia,
          observaciones: sensacionObs.trim(),
        },
        general: {
          calidad_tecnica: calidadTecnica,
          merito_estilistico: meritoEstilistico,
          fuerza_relativa: fuerzaRelativa,
        },
        devolucion: { observaciones: devolucionObs.trim() },
      };

      return createEvaluacion(edicionId, {
        vuelo_id: vueloId,
        muestra_id: muestra.id,
        puntajes,
        comentarios: null,
        comentario_final: null,
        avanza,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluaciones-juez", edicionId] });
      toast.success("Evaluación enviada correctamente");
      resetForm();
      onSuccess();
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        const body = error.response?.data as
          | { error?: { code: string; message: string } }
          | undefined;
        const code = body?.error?.code;

        if (error.response?.status === 409 && code === "EVALUACION_DUPLICADA") {
          toast.error("Esta muestra ya fue evaluada");
          return;
        }
        if (error.response?.status === 403 && code === "SIN_ASIGNACION") {
          toast.error("No tenés asignación para este vuelo");
          return;
        }
      }
      toast.error("No se pudo enviar la evaluación. Intentá de nuevo.");
    },
  });

  function handleSubmit() {
    setAttemptedSubmit(true);
    if (hasErrors) {
      toast.error("Completá los campos obligatorios marcados en rojo.");
      return;
    }
    mutation.mutate();
  }

  const infoAdicionalEntries = muestra.info_adicional
    ? Object.entries(muestra.info_adicional)
    : [];

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-500">
          {juezEmail && (
            <span className="flex items-center gap-1">
              <span className="text-neutral-500">Juez:</span>
              <span className="font-medium text-neutral-900">{juezEmail}</span>
            </span>
          )}
          <span className="hidden text-neutral-300 sm:inline">·</span>
          <span className="flex items-center gap-1">
            <span className="text-neutral-500">Código anónimo:</span>
            {muestra.cod_anonimo ? (
              <span className="font-medium text-neutral-900">{muestra.cod_anonimo}</span>
            ) : (
              <span className="font-medium text-neutral-400">Sin código</span>
            )}
          </span>
          <span className="hidden text-neutral-300 sm:inline">·</span>
          <span className="flex items-center gap-1">
            <span className="text-neutral-500">Estilo:</span>
            <span className="font-medium text-neutral-900">
              {muestra.estilo_codigo} — {muestra.estilo_nombre}
            </span>
          </span>
        </div>
        {infoAdicionalEntries.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-500">
            {infoAdicionalEntries.map(([key, value]) => (
              <span key={key}>
                {key}: <span className="font-medium text-neutral-700">{String(value)}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {/* Columna 1: Apariencia + Aroma */}
        <div className="flex flex-col gap-4">
          <Section title="Apariencia">
            <ObservacionesField
              label="Color, espuma, claridad"
              value={aparienciaObs}
              onChange={setAparienciaObs}
              minWords={5}
              error={mostrarError("apariencia")}
            />
          </Section>

          <Section title="Aroma">
            <AttributeField
              label="Malta"
              options={ESCALA_INTENSIDAD}
              value={aromaAttrs.malta}
              onChange={(v) => setAromaAttrs((prev) => ({ ...prev, malta: v }))}
              error={mostrarError("aromaMalta")}
            />
            <AttributeField
              label="Lúpulo"
              options={ESCALA_INTENSIDAD}
              value={aromaAttrs.lupulo}
              onChange={(v) => setAromaAttrs((prev) => ({ ...prev, lupulo: v }))}
              error={mostrarError("aromaLupulo")}
            />
            <AttributeField
              label="Fermentación"
              options={ESCALA_INTENSIDAD}
              value={aromaAttrs.fermentacion}
              onChange={(v) => setAromaAttrs((prev) => ({ ...prev, fermentacion: v }))}
              error={mostrarError("aromaFermentacion")}
            />
            <AttributeField
              label="Otros ingredientes (fruta, hierbas, etc)"
              options={ESCALA_INTENSIDAD}
              value={aromaAttrs.otrosIngredientes}
              onChange={(v) => setAromaAttrs((prev) => ({ ...prev, otrosIngredientes: v }))}
              error={mostrarError("aromaOtros")}
            />
            <ObservacionesField
              label="Observaciones"
              value={aromaObs}
              onChange={setAromaObs}
              minWords={10}
              error={mostrarError("aromaObs")}
            />
          </Section>
        </div>

        {/* Columna 2: Sabor */}
        <div className="flex flex-col gap-4">
          <Section title="Sabor">
            <AttributeField
              label="Malta"
              options={ESCALA_INTENSIDAD}
              value={saborAttrs.malta}
              onChange={(v) => setSaborAttrs((prev) => ({ ...prev, malta: v }))}
              error={mostrarError("saborMalta")}
            />
            <AttributeField
              label="Lúpulo"
              options={ESCALA_INTENSIDAD}
              value={saborAttrs.lupulo}
              onChange={(v) => setSaborAttrs((prev) => ({ ...prev, lupulo: v }))}
              error={mostrarError("saborLupulo")}
            />
            <AttributeField
              label="Amargor"
              options={ESCALA_INTENSIDAD}
              value={saborAttrs.amargor}
              onChange={(v) => setSaborAttrs((prev) => ({ ...prev, amargor: v }))}
              error={mostrarError("saborAmargor")}
            />
            <AttributeField
              label="Fermentación"
              options={ESCALA_INTENSIDAD}
              value={saborAttrs.fermentacion}
              onChange={(v) => setSaborAttrs((prev) => ({ ...prev, fermentacion: v }))}
              error={mostrarError("saborFermentacion")}
            />
            <AttributeField
              label="Balance"
              options={ESCALA_BALANCE}
              value={saborAttrs.balance}
              onChange={(v) => setSaborAttrs((prev) => ({ ...prev, balance: v }))}
              error={mostrarError("saborBalance")}
              itemClassName="h-14 px-1 text-sm"
            />
            <ObservacionesField
              label="Observaciones"
              value={saborObs}
              onChange={setSaborObs}
              minWords={10}
              error={mostrarError("saborObs")}
            />
          </Section>
        </div>

        {/* Columna 3: Sensación en boca */}
        <div className="flex flex-col gap-4">
          <Section title="Sensación en boca">
            <AttributeField
              label="Cuerpo"
              options={ESCALA_INTENSIDAD}
              value={sensacionAttrs.cuerpo}
              onChange={(v) => setSensacionAttrs((prev) => ({ ...prev, cuerpo: v }))}
              error={mostrarError("sensacionCuerpo")}
            />
            <AttributeField
              label="Carbonatación"
              options={ESCALA_INTENSIDAD}
              value={sensacionAttrs.carbonatacion}
              onChange={(v) => setSensacionAttrs((prev) => ({ ...prev, carbonatacion: v }))}
              error={mostrarError("sensacionCarbonatacion")}
            />
            <AttributeField
              label="Cremosidad"
              options={ESCALA_INTENSIDAD}
              value={sensacionAttrs.cremosidad}
              onChange={(v) => setSensacionAttrs((prev) => ({ ...prev, cremosidad: v }))}
              error={mostrarError("sensacionCremosidad")}
            />
            <AttributeField
              label="Calentamiento"
              options={ESCALA_INTENSIDAD}
              value={sensacionAttrs.calentamiento}
              onChange={(v) => setSensacionAttrs((prev) => ({ ...prev, calentamiento: v }))}
              error={mostrarError("sensacionCalentamiento")}
            />
            <AttributeField
              label="Astringencia"
              options={ESCALA_INTENSIDAD}
              value={sensacionAttrs.astringencia}
              onChange={(v) => setSensacionAttrs((prev) => ({ ...prev, astringencia: v }))}
              error={mostrarError("sensacionAstringencia")}
            />
            <ObservacionesField
              label="Observaciones"
              value={sensacionObs}
              onChange={setSensacionObs}
              minWords={0}
              optional
            />
          </Section>
        </div>

        {/* Columna 4: General + Devolución */}
        <div className="flex flex-col gap-4">
          <Section title="General">
            <div className="space-y-1">
              <span className="text-sm font-medium text-neutral-700">
                Calidad técnica <span className="text-red-500">*</span>
              </span>
              <RadioRow
                options={ESCALA_CALIDAD_TECNICA}
                value={calidadTecnica}
                onChange={setCalidadTecnica}
                error={mostrarError("calidadTecnica")}
                itemClassName="h-14 text-sm"
              />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-neutral-700">
                Mérito estilístico <span className="text-red-500">*</span>
              </span>
              <RadioRow
                options={ESCALA_MERITO_ESTILISTICO}
                value={meritoEstilistico}
                onChange={setMeritoEstilistico}
                error={mostrarError("meritoEstilistico")}
                itemClassName="h-14 px-1 text-sm"
              />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-neutral-700">
                Fuerza relativa dentro del vuelo <span className="text-red-500">*</span>
              </span>
              <RadioRow
                options={ESCALA_FUERZA_RELATIVA.map(String)}
                value={fuerzaRelativa === null ? "" : String(fuerzaRelativa)}
                onChange={(v) => setFuerzaRelativa(Number(v))}
                error={mostrarError("fuerzaRelativa")}
                groupClassName="gap-2"
                itemClassName="py-3 text-base font-semibold"
              />
            </div>
          </Section>

          <Section title="Devolución">
            <ObservacionesField
              label="Observaciones"
              value={devolucionObs}
              onChange={setDevolucionObs}
              minWords={20}
              error={mostrarError("devolucionObs")}
            />
            <div className="space-y-1">
              <span className="text-sm font-medium text-neutral-700">
                ¿Avanza a la siguiente ronda? <span className="text-red-500">*</span>
              </span>
              <ToggleGroup
                value={avanza === null ? [] : [avanza ? "si" : "no"]}
                onValueChange={(next) => setAvanza(next[0] === "si")}
                className={cn(
                  "w-full flex-nowrap",
                  mostrarError("avanza") && "rounded-md ring-1 ring-red-300"
                )}
              >
                <ToggleGroupItem
                  value="si"
                  className="h-auto flex-1 py-2 text-sm data-[pressed]:border-success-500 data-[pressed]:bg-success-500"
                >
                  SÍ
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="no"
                  className="h-auto flex-1 py-2 text-sm data-[pressed]:border-danger-500 data-[pressed]:bg-danger-500"
                >
                  NO
                </ToggleGroupItem>
              </ToggleGroup>
              {mostrarError("avanza") && (
                <p className="text-sm text-destructive">Seleccioná SÍ o NO</p>
              )}
            </div>
          </Section>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? "Enviando..." : "Enviar evaluación"}
        </Button>
      </div>
    </div>
  );
}
