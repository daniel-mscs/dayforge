package com.daniel.workout.model;

import jakarta.persistence.*;

// No seu Exercicio.java
@Entity
public class Exercicio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nome;
    private String grupoMuscular;
    private int series;
    private int repeticoes;
    private double carga;
    private String treino;

    public String getTreino() {
        return treino;
    }

    public void setTreino(String treino) {
        this.treino = treino;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }

    public int getSeries() { return series; }
    public void setSeries(int series) { this.series = series; }

    public int getRepeticoes() { return repeticoes; }
    public void setRepeticoes(int repeticoes) { this.repeticoes = repeticoes; }

    public double getCarga() { return carga; }
    public void setCarga(double carga) { this.carga = carga; }

    public String getGrupoMuscular() { return grupoMuscular; }
    public void setGrupoMuscular(String grupoMuscular) { this.grupoMuscular = grupoMuscular; }
}